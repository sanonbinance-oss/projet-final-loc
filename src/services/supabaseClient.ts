import { createClient } from '@supabase/supabase-js';

// Identifiants Supabase configurés pour le projet PayKal / EduPay
export const SUPABASE_PROJECT_ID = 'kotkvxsalfqyfjnxjsui';
export const SUPABASE_URL = 'https://kotkvxsalfqyfjnxjsui.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_laRCB_Ree-_uzAAeEijpLg_U6f_f0aD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseConnexionStatus {
  connecte: boolean;
  tablesExiste: boolean;
  message: string;
  codeErreur?: string;
  details?: string;
}

/**
 * Service de synchronisation et diagnostic avec la base Supabase
 */
export class SupabaseSyncService {
  /**
   * Teste en temps réel la liaison avec le projet Supabase
   */
  static async testerConnexion(): Promise<SupabaseConnexionStatus> {
    try {
      const { data, error } = await supabase
        .from('tarifs_scolarite')
        .select('*', { count: 'exact', head: true });

      if (error) {
        // Le serveur répond : la clé et le projet sont valides, mais la table n'est pas encore créée
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('schema cache')) {
          return {
            connecte: true,
            tablesExiste: false,
            codeErreur: error.code,
            message: "Liaison Supabase établie avec succès ! Le serveur répond parfaitement, mais la table 'tarifs_scolarite' attend d'être créée via l'éditeur SQL.",
            details: error.message,
          };
        }
        return {
          connecte: false,
          tablesExiste: false,
          codeErreur: error.code,
          message: "Échec d'authentification ou accès refusé : " + error.message,
          details: error.message,
        };
      }

      return {
        connecte: true,
        tablesExiste: true,
        message: "Liaison 100% active et opérationnelle ! Les tables sont créées et répondent sur Supabase.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return {
        connecte: false,
        tablesExiste: false,
        message: "Impossible de contacter l'API Supabase : " + msg,
      };
    }
  }

  /**
   * Tente de charger les tarifs depuis Supabase, avec basculement automatique sur le cache
   */
  static async fetchTarifsFromSupabase(anneeScolaire: string = '2027-2028') {
    try {
      const { data, error } = await supabase
        .from('tarifs_scolarite')
        .select('*')
        .eq('annee_scolaire', anneeScolaire)
        .order('id', { ascending: true });

      if (error) {
        console.warn('[Supabase] Note: Table tarifs_scolarite non encore créée dans Supabase:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[Supabase] Connexion réseau directe indisponible:', err);
      return null;
    }
  }

  /**
   * Sauvegarde ou met à jour un tarif directement dans Supabase
   */
  static async syncTarifToSupabase(tarif: {
    annee_scolaire: string;
    niveau: string;
    montant_scolarite: number;
    frais_inscription: number;
    frais_annexes: number;
  }) {
    try {
      const { data, error } = await supabase
        .from('tarifs_scolarite')
        .upsert(
          {
            annee_scolaire: tarif.annee_scolaire,
            niveau: tarif.niveau,
            montant_scolarite: tarif.montant_scolarite,
            frais_inscription: tarif.frais_inscription,
            frais_annexes: tarif.frais_annexes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'annee_scolaire,niveau' }
        )
        .select();

      if (error) {
        console.warn('[Supabase Sync] Note: table en attente de script SQL:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Sync] Erreur de synchronisation:', err);
      return false;
    }
  }

  /**
   * Enregistre un paiement directement dans Supabase
   */
  static async syncPaiementToSupabase(payment: {
    id: string;
    reference_quittance: string;
    annee_scolaire: string;
    eleve_id: string;
    eleve_matricule: string;
    nom_eleve: string;
    classe_eleve: string;
    montant_total: number;
    montant_scolarite: number;
    montant_don: number;
    mode_paiement: string;
    encaisse_par: string;
    statut_paiement: string;
    code_validation_otp?: string;
    nom_payeur: string;
    telephone_payeur?: string;
    nom_agent?: string;
    observations?: string;
  }) {
    try {
      const { data, error } = await supabase.from('paiements').insert([payment]).select();
      if (error) {
        console.warn('[Supabase Sync] Paiement sauvegardé localement, sync Supabase différée:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Sync] Erreur sync paiement:', err);
      return false;
    }
  }

  /**
   * Synchronise ou met à jour la fiche d'un élève dans Supabase
   */
  static async syncEleveToSupabase(eleve: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    date_naissance?: string;
    classe: string;
    annee_scolaire: string;
    scolarite_totale: number;
    montant_paye?: number;
    montant_don_total?: number;
    nom_parent: string;
    telephone_parent: string;
    email_parent?: string;
    adresse_domicile?: string;
    annee_origine?: string;
    classe_precedente?: string;
    statut_fin_annee?: string;
    statut_reinscription?: string;
    decision_bulletin?: string;
    moyenne_annuelle?: number;
    etablissement_origine?: string;
    motif_venue?: string;
    description_motif?: string;
    bulletin_nom_fichier?: string;
    statut_inscription?: string;
  }) {
    try {
      const { error } = await supabase.from('eleves').upsert(
        {
          ...eleve,
          date_modification: new Date().toISOString(),
        },
        { onConflict: 'matricule' }
      );
      if (error) {
        console.warn('[Supabase Sync Eleve] En attente de création des tables:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Sync Eleve] Erreur:', err);
      return false;
    }
  }

  /**
   * Synchronisation en lot pour l'import massif CSV/Excel
   */
  static async syncElevesBatchToSupabase(eleves: Array<Record<string, unknown>>) {
    try {
      const { error } = await supabase.from('eleves').upsert(eleves, { onConflict: 'matricule' });
      if (error) {
        console.warn('[Supabase Batch Eleves] Sync différée:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Batch Eleves] Erreur:', err);
      return false;
    }
  }

  /**
   * Enregistre ou met à jour une demande d'admission en ligne
   */
  static async syncDemandeAdmissionToSupabase(demande: {
    id: string;
    annee_scolaire: string;
    nom_enfant: string;
    prenom_enfant: string;
    date_naissance?: string;
    classe_demandee: string;
    nom_parent: string;
    telephone_parent: string;
    email_parent?: string;
    adresse_domicile?: string;
    est_nouvel_eleve?: boolean;
    etablissement_origine?: string;
    decision_bulletin?: string;
    moyenne_annuelle?: number;
    motif_venue?: string;
    description_motif?: string;
    bulletin_nom_fichier?: string;
    montant_don?: number;
    statut_admission: string;
    matricule_attribue?: string;
    motif_refus?: string;
  }) {
    try {
      const { error } = await supabase.from('demandes_admission').upsert(demande, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Sync Demande] Sync différée:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Sync Demande] Erreur:', err);
      return false;
    }
  }

  /**
   * Enregistre une inscription annuelle de suivi
   */
  static async syncInscriptionAnnuelleToSupabase(inscription: {
    eleve_id: string;
    eleve_matricule: string;
    annee_scolaire: string;
    classe: string;
    scolarite_totale: number;
    montant_paye: number;
    statut_reinscription: string;
  }) {
    try {
      const { error } = await supabase.from('inscriptions_annuelles').upsert(
        inscription,
        { onConflict: 'eleve_id,annee_scolaire' }
      );
      if (error) {
        console.warn('[Supabase Sync Inscription] Sync différée:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Sync Inscription] Erreur:', err);
      return false;
    }
  }
}

