import { supabase, SupabaseSyncService } from './supabaseClient';
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
  message: 'Initialisation de la synchronisation Supabase...',
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
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let syncInFlight: Promise<void> | null = null;
let lastTriggerTime = 0;
let eventListenersBound = false;

function formatSupabaseError(code?: string, error?: string): string {
  const msg = error || 'Impossible de joindre la base Supabase.';
  if (
    code === 'PGRST205' ||
    msg.includes('Could not find the table') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  ) {
    return "Tables Supabase introuvables : veuillez exécuter le script schema.sql dans l'Éditeur SQL de Supabase.";
  }
  if (code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission denied')) {
    return `Accès refusé par Supabase (RLS) : ${msg}`;
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
   * Lance la synchronisation bidirectionnelle complète :
   * 1. Vide la file d'attente locale (outbox) vers Supabase
   * 2. Charge les données à jour depuis Supabase
   * 3. Écoute en temps réel via Supabase Realtime (WebSocket)
   * 4. Maintient un polling de secours toutes les 5 secondes + reprise d'onglet/réseau
   */
  static async initialiser() {
    if (typeof window === 'undefined') return;

    currentState.estEnCours = true;
    notifierSync();

    await this.synchroniserTout();
    this.activerRealtime();

    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        void this.synchroniserTout(true);
      }, 5000);
    }

    if (!eventListenersBound) {
      eventListenersBound = true;
      window.addEventListener('focus', handleWakeupSync);
      window.addEventListener('online', handleWakeupSync);
      document.addEventListener('visibilitychange', handleWakeupSync);
    }
  }

  /**
   * Envoie d'abord les éléments en attente (outbox), puis télécharge les données depuis Supabase
   */
  static async synchroniserTout(estSilencieux: boolean = false): Promise<void> {
    if (syncInFlight) {
      return syncInFlight;
    }

    const runner = (async () => {
      if (!estSilencieux) {
        currentState.estEnCours = true;
        notifierSync();
      }

      try {
        // 0. Tenter d'abord d'envoyer tout ce qui est en attente dans l'outbox locale
        const outboxResult = await SchoolStore.flushOutbox();
        currentState.nbEnAttenteEnvoi = outboxResult.remaining;

        const [demandesRes, elevesRes, paiementsRes, tarifsRes, auditRaw] = await Promise.all([
          SupabaseSyncService.fetchDemandesAdmissionWithStatus(),
          SupabaseSyncService.fetchElevesWithStatus(),
          SupabaseSyncService.fetchPaiementsWithStatus(),
          SupabaseSyncService.fetchTarifsFromSupabaseWithStatus(CURRENT_SCHOOL_YEAR),
          SupabaseSyncService.fetchAuditLogsFromSupabase(),
        ]);

        const outbox = SchoolStore.getOutbox();
        const pendingDemandeIds = new Set(outbox.filter((o) => o.kind === 'DEMANDE').map((o) => o.recordId));
        const pendingEleveIds = new Set(outbox.filter((o) => o.kind === 'ELEVE').map((o) => o.recordId));
        const pendingPaiementIds = new Set(outbox.filter((o) => o.kind === 'PAIEMENT').map((o) => o.recordId));

        // 1. Demandes d'admission
        if (demandesRes.data && Array.isArray(demandesRes.data)) {
          const cloudDemandes: AdmissionRequest[] = demandesRes.data.map(Mappers.demandeFromSupabase);
          const locales = SchoolStore.getAdmissions();

          const map = new Map<string, AdmissionRequest>();
          locales.forEach((d) => map.set(d.id, d));
          cloudDemandes.forEach((d) => {
            const existing = map.get(d.id);
            if (existing && pendingDemandeIds.has(d.id)) {
              // Conserver la version locale tant que sa modification est encore en file d'envoi
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
        if (elevesRes.data && Array.isArray(elevesRes.data)) {
          const cloudEleves: Student[] = elevesRes.data.map(Mappers.eleveFromSupabase);
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
        if (paiementsRes.data && Array.isArray(paiementsRes.data)) {
          const cloudPaiements: Payment[] = paiementsRes.data.map(Mappers.paiementFromSupabase);
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
        if (tarifsRes.data && Array.isArray(tarifsRes.data) && tarifsRes.data.length > 0) {
          const cloudTarifs: TuitionTariff[] = tarifsRes.data.map(Mappers.tarifFromSupabase);
          SchoolStore.saveTarifs(cloudTarifs);
        }

        // 5. Journal d'audit
        if (auditRaw && Array.isArray(auditRaw)) {
          const cloudLogs: AuditLog[] = auditRaw.map(Mappers.auditLogFromSupabase);
          const locales = SchoolStore.getAuditLogs();
          const map = new Map<string, AuditLog>();
          locales.forEach((l) => map.set(l.id, l));
          cloudLogs.forEach((l) => map.set(l.id, l));
          const fusion = Array.from(map.values()).sort(
            (a, b) => new Date(b.dateAction).getTime() - new Date(a.dateAction).getTime()
          );
          SchoolStore.saveAuditLogs(fusion);
        }

        // Vérification réelle de la santé des tables principales
        const firstCoreError =
          (demandesRes.error ? { code: demandesRes.code, error: demandesRes.error } : null) ||
          (elevesRes.error ? { code: elevesRes.code, error: elevesRes.error } : null) ||
          (paiementsRes.error ? { code: paiementsRes.code, error: paiementsRes.error } : null);

        if (firstCoreError) {
          currentState.estConnecte = false;
          currentState.estEnCours = false;
          currentState.statut = 'erreur';
          currentState.messageErreur = formatSupabaseError(firstCoreError.code, firstCoreError.error);
          currentState.message = 'Synchronisation Supabase interrompue';
          notifierSync();
          return;
        }

        currentState.estConnecte = true;
        currentState.estEnCours = false;
        currentState.statut = 'connecte';
        currentState.messageErreur = null;
        currentState.derniereSynchro = new Date().toLocaleTimeString('fr-FR');
        currentState.message =
          outboxResult.remaining > 0
            ? `Connecté à Supabase (${outboxResult.remaining} élément(s) en attente d'envoi)`
            : 'Connecté à Supabase · Synchronisation en direct active';
        notifierSync();
      } catch (err) {
        console.warn('[SyncService] Synchronisation partielle :', err);
        currentState.estConnecte = false;
        currentState.estEnCours = false;
        currentState.statut = 'erreur';
        currentState.messageErreur = err instanceof Error ? err.message : 'Erreur de connexion Supabase';
        currentState.message = 'Synchronisation locale (Supabase temporairement inaccessible)';
        notifierSync();
      } finally {
        syncInFlight = null;
      }
    })();

    syncInFlight = runner;
    return runner;
  }

  /**
   * Active les canaux Supabase Realtime pour recevoir les nouveaux enregistrements instantanément
   */
  private static activerRealtime() {
    if (realtimeChannel) return;

    try {
      realtimeChannel = supabase
        .channel('edupay_changes_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'demandes_admission' },
          () => {
            void this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'eleves' },
          () => {
            void this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'paiements' },
          () => {
            void this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tarifs_scolarite' },
          () => {
            void this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'journal_activites' },
          () => {
            void this.synchroniserTout(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void this.synchroniserTout(true);
          }
        });
    } catch (err) {
      console.warn('[SyncService] Erreur abonnement Realtime :', err);
    }
  }

  /**
   * Arrête les écoutes en arrière-plan
   */
  static arreter() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (realtimeChannel) {
      void supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    if (eventListenersBound && typeof window !== 'undefined') {
      eventListenersBound = false;
      window.removeEventListener('focus', handleWakeupSync);
      window.removeEventListener('online', handleWakeupSync);
      document.removeEventListener('visibilitychange', handleWakeupSync);
    }
  }
}

