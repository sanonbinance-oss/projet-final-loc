import { SupabaseSyncService, getActiveAuthScope, getParentAccount } from './supabaseClient';
import { Mappers } from './mappers';
import { SchoolStore, CURRENT_SCHOOL_YEAR } from './store';
import { Student, AdmissionRequest, Payment, TuitionTariff, AuditLog } from '../types';

export interface SyncState {
  estConnecte: boolean;
  estEnCours: boolean;
  statut: 'connecte' | 'synchronisation' | 'erreur';
  derniereSynchro: string | null;
  message: string;
  messageErreur?: string | null;
  nbDemandes: number;
  nbEleves: number;
  nbPaiements: number;
  nbEnAttenteEnvoi?: number;
}

type SyncListener = (state: SyncState) => void;
const syncListeners = new Set<SyncListener>();

let currentState: SyncState = {
  estConnecte: false,
  estEnCours: false,
  statut: 'synchronisation',
  derniereSynchro: null,
  message: 'Initialisation...',
  messageErreur: null,
  nbDemandes: 0,
  nbEleves: 0,
  nbPaiements: 0,
  nbEnAttenteEnvoi: 0,
};

function notifierSync() {
  syncListeners.forEach((fn) => fn({ ...currentState }));
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let syncInFlight: Promise<void> | null = null;
let lastTriggerTime = 0;
let eventListenersBound = false;

function formatDbError(error?: string): string {
  const msg = error || 'Impossible de joindre le serveur.';
  if (msg.includes('DATABASE_URL') || msg.includes('POSTGRES_URL') || msg.includes('non reliée')) {
    return 'Base de données non reliée.';
  }
  return msg;
}

const handleWakeupSync = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const now = Date.now();
  if (now - lastTriggerTime < 1500) return;
  lastTriggerTime = now;
  void SyncService.synchroniserTout(true);
};

export class SyncService {
  static getStatus(): SyncState {
    return { ...currentState };
  }

  static getState(): SyncState {
    return { ...currentState };
  }

  static async synchroniserMaintenant(): Promise<void> {
    await this.synchroniserTout(false);
  }

  static subscribe(fn: SyncListener) {
    syncListeners.add(fn);
    fn({ ...currentState });
    return () => {
      syncListeners.delete(fn);
    };
  }

  static async initialiser() {
    if (typeof window === 'undefined') return;

    currentState.estEnCours = true;
    notifierSync();

    await this.synchroniserTout();

    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        void this.synchroniserTout(true);
      }, 6000);
    }

    if (!eventListenersBound) {
      eventListenersBound = true;
      window.addEventListener('focus', handleWakeupSync);
      window.addEventListener('online', handleWakeupSync);
      document.addEventListener('visibilitychange', handleWakeupSync);
    }
  }

  static async synchroniserTout(estSilencieux: boolean = false): Promise<void> {
    if (syncInFlight) {
      return syncInFlight;
    }

    const runner = (async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        currentState.estConnecte = false;
        currentState.estEnCours = false;
        currentState.statut = 'erreur';
        currentState.messageErreur = 'Appareil hors ligne : vérifiez votre connexion Internet.';
        notifierSync();
        syncInFlight = null;
        return;
      }

      if (!estSilencieux) {
        currentState.estEnCours = true;
        notifierSync();
      }

      try {
        const expectedScope = getActiveAuthScope();
        const expectedParentId = getParentAccount()?.id || null;

        // 1. Vider la file d'attente locale (outbox) du scope actif
        const outboxResult = await SchoolStore.flushOutbox();
        currentState.nbEnAttenteEnvoi = outboxResult.remaining;

        // 2. Télécharger les données autorisées pour le scope courant
        const cloud = await SupabaseSyncService.fetchAllFromCloud(CURRENT_SCHOOL_YEAR);

        // Si l'utilisateur a changé d'espace/compte pendant la requête réseau, ignorer cette réponse obsolète
        if (getActiveAuthScope() !== expectedScope || (getParentAccount()?.id || null) !== expectedParentId) {
          return;
        }

        if (!cloud.ok) {
          currentState.estConnecte = false;
          currentState.estEnCours = false;
          currentState.statut = 'erreur';
          currentState.messageErreur = formatDbError(cloud.error);
          currentState.message = 'Synchronisation interrompue';
          notifierSync();
          return;
        }

        // Tarifs publics toujours mis à jour
        if (Array.isArray(cloud.tarifs) && cloud.tarifs.length > 0) {
          const cloudTarifs: TuitionTariff[] = cloud.tarifs.map(Mappers.tarifFromSupabase);
          SchoolStore.saveTarifs(cloudTarifs);
        }

        // Si visiteur non connecté (PUBLIC), vider strictement toutes données personnelles
        if (cloud.scope === 'PUBLIC') {
          SchoolStore.saveAdmissions([]);
          SchoolStore.saveStudents([]);
          SchoolStore.savePayments([]);
          SchoolStore.saveAuditLogs([]);
          currentState.nbDemandes = 0;
          currentState.nbEleves = 0;
          currentState.nbPaiements = 0;
          currentState.estConnecte = true;
          currentState.estEnCours = false;
          currentState.statut = 'connecte';
          currentState.messageErreur = null;
          currentState.derniereSynchro = new Date().toLocaleTimeString('fr-FR');
          notifierSync();
          return;
        }

        const outbox = SchoolStore.getOutbox();
        const pendingDemandeIds = new Set(outbox.filter((o) => o.kind === 'DEMANDE').map((o) => o.recordId));
        const pendingEleveIds = new Set(outbox.filter((o) => o.kind === 'ELEVE').map((o) => o.recordId));
        const pendingPaiementIds = new Set(outbox.filter((o) => o.kind === 'PAIEMENT').map((o) => o.recordId));

        // 1. Demandes d'admission (source de vérité = cloud + éléments outbox non encore envoyés)
        if (Array.isArray(cloud.demandes)) {
          const cloudDemandes: AdmissionRequest[] = cloud.demandes.map(Mappers.demandeFromSupabase);
          const locales = SchoolStore.getAdmissions();
          const localMap = new Map<string, AdmissionRequest>();
          locales.forEach((d) => localMap.set(d.id, d));

          const map = new Map<string, AdmissionRequest>();
          cloudDemandes.forEach((d) => {
            const existing = localMap.get(d.id);
            if (existing && pendingDemandeIds.has(d.id)) {
              map.set(d.id, existing);
            } else {
              map.set(d.id, {
                ...d,
                bulletinUrl: d.bulletinUrl || existing?.bulletinUrl,
                extraitNaissanceUrl: d.extraitNaissanceUrl || existing?.extraitNaissanceUrl,
              });
            }
          });
          // Ajouter les nouvelles demandes encore dans la file outbox
          pendingDemandeIds.forEach((id) => {
            if (!map.has(id)) {
              const localItem = localMap.get(id);
              if (localItem) map.set(id, localItem);
            }
          });

          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime()
          );

          SchoolStore.saveAdmissions(fusion);
          currentState.nbDemandes = fusion.length;
        }

        // 2. Élèves
        if (Array.isArray(cloud.eleves)) {
          const cloudEleves: Student[] = cloud.eleves.map(Mappers.eleveFromSupabase);
          const locales = SchoolStore.getStudents();
          const localMap = new Map<string, Student>();
          locales.forEach((s) => localMap.set(s.id, s));

          const map = new Map<string, Student>();
          cloudEleves.forEach((s) => {
            const existing = localMap.get(s.id);
            if (existing && pendingEleveIds.has(s.id)) {
              map.set(s.id, existing);
            } else {
              map.set(s.id, s);
            }
          });
          pendingEleveIds.forEach((id) => {
            if (!map.has(id)) {
              const localItem = localMap.get(id);
              if (localItem) map.set(id, localItem);
            }
          });

          const fusion = Array.from(map.values());
          SchoolStore.saveStudents(fusion);
          currentState.nbEleves = fusion.length;
        }

        // 3. Paiements
        if (Array.isArray(cloud.paiements)) {
          const cloudPaiements: Payment[] = cloud.paiements.map(Mappers.paiementFromSupabase);
          const locales = SchoolStore.getPayments();
          const localMap = new Map<string, Payment>();
          locales.forEach((p) => localMap.set(p.id, p));

          const map = new Map<string, Payment>();
          cloudPaiements.forEach((p) => {
            const existing = localMap.get(p.id);
            if (existing && pendingPaiementIds.has(p.id)) {
              map.set(p.id, existing);
            } else {
              map.set(p.id, p);
            }
          });
          pendingPaiementIds.forEach((id) => {
            if (!map.has(id)) {
              const localItem = localMap.get(id);
              if (localItem) map.set(id, localItem);
            }
          });

          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          SchoolStore.savePayments(fusion);
          currentState.nbPaiements = fusion.length;
        }

        // 4. Journal d'audit (réservé personnel)
        if (cloud.scope === 'STAFF' && Array.isArray(cloud.auditLogs)) {
          const cloudLogs: AuditLog[] = cloud.auditLogs.map(Mappers.auditLogFromSupabase);
          const locales = SchoolStore.getAuditLogs();
          const map = new Map<string, AuditLog>();
          locales.forEach((l) => map.set(l.id, l));
          cloudLogs.forEach((l) => map.set(l.id, l));
          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.dateAction).getTime() - new Date(a.dateAction).getTime()
          );
          SchoolStore.saveAuditLogs(fusion);
        } else if (cloud.scope !== 'STAFF') {
          SchoolStore.saveAuditLogs([]);
        }

        currentState.estConnecte = true;
        currentState.estEnCours = false;
        currentState.statut = 'connecte';
        currentState.messageErreur = null;
        currentState.derniereSynchro = new Date().toLocaleTimeString('fr-FR');
        currentState.message = 'Synchronisé';
        notifierSync();
      } catch (err) {
        console.warn('[SyncService] Synchronisation partielle :', err);
        currentState.estConnecte = false;
        currentState.estEnCours = false;
        currentState.statut = 'erreur';
        currentState.messageErreur = err instanceof Error ? err.message : 'Erreur de connexion';
        currentState.message = 'Synchronisation locale';
        notifierSync();
      } finally {
        syncInFlight = null;
      }
    })();

    syncInFlight = runner;
    return runner;
  }

  static arreter() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (eventListenersBound && typeof window !== 'undefined') {
      eventListenersBound = false;
      window.removeEventListener('focus', handleWakeupSync);
      window.removeEventListener('online', handleWakeupSync);
      document.removeEventListener('visibilitychange', handleWakeupSync);
    }
  }
}
