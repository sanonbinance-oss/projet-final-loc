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
};

function notifierSync() {
  syncListeners.forEach((fn) => fn({ ...currentState }));
}

let pollingInterval: any = null;
let realtimeChannel: any = null;

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
   * 1. Charge les données depuis Supabase
   * 2. Écoute en temps réel via Supabase Realtime (WebSocket)
   * 3. Maintient un polling de secours toutes les 6 secondes
   */
  static async initialiser() {
    if (typeof window === 'undefined') return;

    currentState.estEnCours = true;
    notifierSync();

    // 1. Premier chargement complet
    await this.synchroniserTout();

    // 2. Écoute Supabase Realtime
    this.activerRealtime();

    // 3. Polling de secours toutes les 6 secondes
    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        this.synchroniserTout(true);
      }, 6000);
    }
  }

  /**
   * Télécharge les données depuis Supabase et met à jour le Store local
   */
  static async synchroniserTout(estSilencieux: boolean = false) {
    if (!estSilencieux) {
      currentState.estEnCours = true;
      notifierSync();
    }

    try {
      const [demandesRaw, elevesRaw, paiementsRaw, tarifsRaw, auditRaw] = await Promise.all([
        SupabaseSyncService.fetchDemandesAdmissionFromSupabase(),
        SupabaseSyncService.fetchElevesFromSupabase(),
        SupabaseSyncService.fetchPaiementsFromSupabase(),
        SupabaseSyncService.fetchTarifsFromSupabase(CURRENT_SCHOOL_YEAR),
        SupabaseSyncService.fetchAuditLogsFromSupabase(),
      ]);

      let aMisAJour = false;

      // 1. Demandes d'admission
      if (demandesRaw && Array.isArray(demandesRaw)) {
        const cloudDemandes: AdmissionRequest[] = demandesRaw.map(Mappers.demandeFromSupabase);
        const locales = SchoolStore.getAdmissions();
        
        // Fusionner en conservant les plus récentes
        const map = new Map<string, AdmissionRequest>();
        locales.forEach((d) => map.set(d.id, d));
        cloudDemandes.forEach((d) => map.set(d.id, d));
        
        const fusion = Array.from(map.values()).sort(
          (a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime()
        );
        
        SchoolStore.saveAdmissions(fusion);
        currentState.nbDemandes = fusion.length;
        aMisAJour = true;
      }

      // 2. Élèves
      if (elevesRaw && Array.isArray(elevesRaw)) {
        const cloudEleves: Student[] = elevesRaw.map(Mappers.eleveFromSupabase);
        const locales = SchoolStore.getStudents();
        
        const map = new Map<string, Student>();
        locales.forEach((s) => map.set(s.id, s));
        cloudEleves.forEach((s) => map.set(s.id, s));
        
        const fusion = Array.from(map.values());
        SchoolStore.saveStudents(fusion);
        currentState.nbEleves = fusion.length;
        aMisAJour = true;
      }

      // 3. Paiements
      if (paiementsRaw && Array.isArray(paiementsRaw)) {
        const cloudPaiements: Payment[] = paiementsRaw.map(Mappers.paiementFromSupabase);
        const locales = SchoolStore.getPayments();
        
        const map = new Map<string, Payment>();
        locales.forEach((p) => map.set(p.id, p));
        cloudPaiements.forEach((p) => map.set(p.id, p));
        
        const fusion = Array.from(map.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        SchoolStore.savePayments(fusion);
        currentState.nbPaiements = fusion.length;
        aMisAJour = true;
      }

      // 4. Tarifs
      if (tarifsRaw && Array.isArray(tarifsRaw) && tarifsRaw.length > 0) {
        const cloudTarifs: TuitionTariff[] = tarifsRaw.map(Mappers.tarifFromSupabase);
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

      currentState.estConnecte = true;
      currentState.estEnCours = false;
      currentState.statut = 'connecte';
      currentState.messageErreur = null;
      currentState.derniereSynchro = new Date().toLocaleTimeString('fr-FR');
      currentState.message = 'Connecté à Supabase · Synchronisation en direct active';
      notifierSync();
    } catch (err) {
      console.warn('[SyncService] Synchronisation partielle :', err);
      currentState.estEnCours = false;
      currentState.statut = 'erreur';
      currentState.messageErreur = err instanceof Error ? err.message : 'Erreur de connexion';
      currentState.message = 'Synchronisation locale (Supabase temporairement inaccessible)';
      notifierSync();
    }
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
          (payload) => {
            console.log('[Realtime] Changement détecté sur demandes_admission:', payload);
            this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'eleves' },
          (payload) => {
            console.log('[Realtime] Changement détecté sur eleves:', payload);
            this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'paiements' },
          (payload) => {
            console.log('[Realtime] Changement détecté sur paiements:', payload);
            this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tarifs_scolarite' },
          (payload) => {
            console.log('[Realtime] Changement détecté sur tarifs_scolarite:', payload);
            this.synchroniserTout(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'journal_activites' },
          (payload) => {
            console.log('[Realtime] Nouveau log dans journal_activites:', payload);
            this.synchroniserTout(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            currentState.estConnecte = true;
            currentState.message = 'Supabase Realtime connecté en direct';
            notifierSync();
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
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }
}
