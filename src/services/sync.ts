import { SupabaseSyncService } from './supabaseClient';
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
  message: 'Initialisation de la synchronisation Vercel PostgreSQL...',
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
  const msg = error || 'Impossible de joindre la base Vercel PostgreSQL.';
  if (msg.includes('DATABASE_URL') || msg.includes('POSTGRES_URL') || msg.includes('non reliée')) {
    return 'Base Vercel non reliée : connectez Neon / Postgres dans Vercel → Storage à votre projet puis redéployez.';
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

  /**
   * Lance la synchronisation bidirectionnelle complète via l'API Vercel PostgreSQL :
   * 1. Vide la file d'attente locale (outbox) vers /api/db
   * 2. Charge toutes les données à jour en 1 seule requête rapide
   * 3. Maintient une actualisation automatique toutes les 6 secondes + reprise d'onglet/réseau
   */
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
        currentState.messageErreur = 'Appareil hors ligne : vérifiez votre connexion Internet mobile ou Wi-Fi.';
        notifierSync();
        syncInFlight = null;
        return;
      }

      if (!estSilencieux) {
        currentState.estEnCours = true;
        notifierSync();
      }

      try {
        // 1. Tenter d'abord d'envoyer tout ce qui est en attente dans l'outbox locale
        const outboxResult = await SchoolStore.flushOutbox();
        currentState.nbEnAttenteEnvoi = outboxResult.remaining;

        // 2. Télécharger toutes les tables en 1 seule requête HTTP optimisée
        const cloud = await SupabaseSyncService.fetchAllFromCloud(CURRENT_SCHOOL_YEAR);

        if (!cloud.ok) {
          currentState.estConnecte = false;
          currentState.estEnCours = false;
          currentState.statut = 'erreur';
          currentState.messageErreur = formatDbError(cloud.error);
          currentState.message = 'Synchronisation Vercel PostgreSQL interrompue';
          notifierSync();
          return;
        }

        const outbox = SchoolStore.getOutbox();
        const pendingDemandeIds = new Set(outbox.filter((o) => o.kind === 'DEMANDE').map((o) => o.recordId));
        const pendingEleveIds = new Set(outbox.filter((o) => o.kind === 'ELEVE').map((o) => o.recordId));
        const pendingPaiementIds = new Set(outbox.filter((o) => o.kind === 'PAIEMENT').map((o) => o.recordId));

        // 1. Demandes d'admission
        if (Array.isArray(cloud.demandes)) {
          const cloudDemandes: AdmissionRequest[] = cloud.demandes.map(Mappers.demandeFromSupabase);
          const locales = SchoolStore.getAdmissions();

          const map = new Map<string, AdmissionRequest>();
          locales.forEach((d) => map.set(d.id, d));
          cloudDemandes.forEach((d) => {
            const existing = map.get(d.id);
            if (existing && pendingDemandeIds.has(d.id)) {
              return;
            }
            map.set(d.id, {
              ...d,
              bulletinUrl: d.bulletinUrl || existing?.bulletinUrl,
            });
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

          const map = new Map<string, Student>();
          locales.forEach((s) => map.set(s.id, s));
          cloudEleves.forEach((s) => {
            const existing = map.get(s.id);
            if (existing && pendingEleveIds.has(s.id)) {
              return;
            }
            map.set(s.id, s);
          });

          const fusion = Array.from(map.values());
          SchoolStore.saveStudents(fusion);
          currentState.nbEleves = fusion.length;
        }

        // 3. Paiements
        if (Array.isArray(cloud.paiements)) {
          const cloudPaiements: Payment[] = cloud.paiements.map(Mappers.paiementFromSupabase);
          const locales = SchoolStore.getPayments();

          const map = new Map<string, Payment>();
          locales.forEach((p) => map.set(p.id, p));
          cloudPaiements.forEach((p) => {
            const existing = map.get(p.id);
            if (existing && pendingPaiementIds.has(p.id)) {
              return;
            }
            map.set(p.id, p);
          });

          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          SchoolStore.savePayments(fusion);
          currentState.nbPaiements = fusion.length;
        }

        // 4. Tarifs
        if (Array.isArray(cloud.tarifs) && cloud.tarifs.length > 0) {
          const cloudTarifs: TuitionTariff[] = cloud.tarifs.map(Mappers.tarifFromSupabase);
          SchoolStore.saveTarifs(cloudTarifs);
        }

        // 5. Journal d'audit
        if (Array.isArray(cloud.auditLogs) && cloud.auditLogs.length > 0) {
          const cloudLogs: AuditLog[] = cloud.auditLogs.map(Mappers.auditLogFromSupabase);
          const locales = SchoolStore.getAuditLogs();
          const map = new Map<string, AuditLog>();
          locales.forEach((l) => map.set(l.id, l));
          cloudLogs.forEach((l) => map.set(l.id, l));
          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.dateAction).getTime() - new Date(a.dateAction).getTime()
          );
          SchoolStore.saveAuditLogs(fusion);
        }

        currentState.estConnecte = true;
        currentState.estEnCours = false;
        currentState.statut = 'connecte';
        currentState.messageErreur = null;
        currentState.derniereSynchro = new Date().toLocaleTimeString('fr-FR');
        currentState.message =
          outboxResult.remaining > 0
            ? `Connecté à Vercel PostgreSQL (${outboxResult.remaining} élément(s) en attente d'envoi)`
            : 'Connecté à Vercel PostgreSQL · Synchronisation en direct active';
        notifierSync();
      } catch (err) {
        console.warn('[SyncService] Synchronisation partielle :', err);
        currentState.estConnecte = false;
        currentState.estEnCours = false;
        currentState.statut = 'erreur';
        currentState.messageErreur = err instanceof Error ? err.message : 'Erreur de connexion Vercel PostgreSQL';
        currentState.message = 'Synchronisation locale (Base Vercel temporairement inaccessible)';
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
