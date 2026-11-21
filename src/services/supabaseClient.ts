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

export interface SyncResult {
  ok: boolean;
  error?: string;
  code?: string;
}

export interface FetchResult<T = any> {
  data: T[] | null;
  error?: string;
  code?: string;
}

function cleanRecordForPostgres(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined) continue;
    // PostgreSQL DATE columns reject empty string ""
    if (k === 'date_naissance' && (v === '' || v === null)) {
      cleaned[k] = null;
      continue;
    }
    if (typeof v === 'number' && Number.isNaN(v)) {
      cleaned[k] = null;
      continue;
    }
    cleaned[k] = v;
  }
  return cleaned;
}

function extractMissingColumnName(message?: string): string | null {
  if (!message) return null;
  // PostgREST schema cache error: "Could not find the 'motif_refus' column of 'demandes_admission' in the schema cache"
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch) return pgrstMatch[1];
  // Postgres error: 'column "motif_refus" of relation "demandes_admission" does not exist'
  const pgMatch = message.match(/column "([^"]+)" of relation/i);
  if (pgMatch) return pgMatch[1];
  return null;
}

async function upsertResilient(
  table: string,
  rawPayload: Record<string, unknown>,
  onConflict: string
): Promise<SyncResult> {
  let payload = cleanRecordForPostgres(rawPayload);
  let imageStripped = false;
  let enumDowngraded = false;
  let fkCleared = false;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const { error } = await supabase.from(table).upsert(payload, { onConflict });
      if (!error) {
        return { ok: true };
      }

      const msg = error.message || '';
      const code = error.code || '';

      // 1. Missing column in remote Supabase table (e.g. schema created before new field)
      const missingCol = extractMissingColumnName(msg);
      if (missingCol && missingCol in payload) {
        console.warn(`[Supabase] Colonne absente "${missingCol}" sur ${table}, nouvelle tentative sans cette colonne.`);
        const next = { ...payload };
        delete next[missingCol];
        payload = next;
        continue;
      }

      // 2. Old PostgreSQL ENUM without EN_ATTENTE_VERIFICATION
      if (
        table === 'paiements' &&
        !enumDowngraded &&
        (code === '22P02' || msg.includes('type_statut_paiement') || msg.includes('EN_ATTENTE_VERIFICATION')) &&
        payload.statut_paiement === 'EN_ATTENTE_VERIFICATION'
      ) {
        enumDowngraded = true;
        const obs = typeof payload.observations === 'string' ? payload.observations : '';
        payload = {
          ...payload,
          statut_paiement: 'EN_COURS',
          observations: `[EN_ATTENTE_VERIFICATION] ${obs}`.trim(),
        };
        continue;
      }

      // 3. Large embedded image inside observations_secretaire rejected/timed out
      if (
        table === 'demandes_admission' &&
        !imageStripped &&
        typeof payload.observations_secretaire === 'string' &&
        payload.observations_secretaire.includes('[BULLETIN_IMG]')
      ) {
        imageStripped = true;
        const strippedObs = payload.observations_secretaire
          .replace(/\[BULLETIN_IMG\][\s\S]*?\[\/BULLETIN_IMG\]\s*/g, '')
          .trim();
        payload = {
          ...payload,
          observations_secretaire: strippedObs || null,
        };
        continue;
      }

      // 4. Foreign key violation on matricule_attribue when eleve row isn't committed yet
      if (
        table === 'demandes_admission' &&
        !fkCleared &&
        (code === '23503' || msg.includes('foreign key') || msg.includes('matricule_attribue')) &&
        payload.matricule_attribue
      ) {
        fkCleared = true;
        payload = {
          ...payload,
          matricule_attribue: null,
        };
        continue;
      }

      console.warn(`[Supabase Sync ${table}] Erreur (${code}):`, msg);
      return { ok: false, error: msg, code };
    } catch (err: unknown) {
      // Network error or timeout on large payload: try stripping embedded image once
      if (
        table === 'demandes_admission' &&
        !imageStripped &&
        typeof payload.observations_secretaire === 'string' &&
        payload.observations_secretaire.includes('[BULLETIN_IMG]')
      ) {
        imageStripped = true;
        const strippedObs = payload.observations_secretaire
          .replace(/\[BULLETIN_IMG\][\s\S]*?\[\/BULLETIN_IMG\]\s*/g, '')
          .trim();
        payload = {
          ...payload,
          observations_secretaire: strippedObs || null,
        };
        continue;
      }
      const msg = err instanceof Error ? err.message : 'Erreur réseau Supabase';
      console.warn(`[Supabase Sync ${table}] Exception:`, msg);
      return { ok: false, error: msg };
    }
  }

  return { ok: false, error: `Échec de synchronisation sur ${table} après plusieurs tentatives.` };
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
      const { error } = await supabase
        .from('demandes_admission')
        .select('id', { count: 'exact', head: true });

      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache')
        ) {
          return {
            connecte: true,
            tablesExiste: false,
            codeErreur: error.code,
            message:
              "Liaison Supabase établie avec succès ! Le serveur répond parfaitement, mais les tables ('demandes_admission', 'tarifs_scolarite', etc.) attendent d'être créées via l'éditeur SQL.",
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

  static async fetchTarifsFromSupabaseWithStatus(anneeScolaire: string = '2027-2028'): Promise<FetchResult> {
    try {
      const { data, error } = await supabase
        .from('tarifs_scolarite')
        .select('*')
        .eq('annee_scolaire', anneeScolaire)
        .order('id', { ascending: true });

      if (error) {
        return { data: null, error: error.message, code: error.code };
      }
      return { data: data || [] };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async fetchTarifsFromSupabase(anneeScolaire: string = '2027-2028') {
    const res = await this.fetchTarifsFromSupabaseWithStatus(anneeScolaire);
    return res.data;
  }

  static async syncTarifToSupabase(tarif: {
    annee_scolaire: string;
    niveau: string;
    montant_scolarite: number;
    frais_inscription: number;
    frais_annexes: number;
  }): Promise<SyncResult> {
    return upsertResilient(
      'tarifs_scolarite',
      {
        annee_scolaire: tarif.annee_scolaire,
        niveau: tarif.niveau,
        montant_scolarite: tarif.montant_scolarite,
        frais_inscription: tarif.frais_inscription,
        frais_annexes: tarif.frais_annexes,
        updated_at: new Date().toISOString(),
      },
      'annee_scolaire,niveau'
    );
  }

  static async syncPaiementToSupabase(payment: Record<string, unknown>): Promise<SyncResult> {
    return upsertResilient('paiements', payment, 'id');
  }

  static async syncEleveToSupabase(eleve: Record<string, unknown>): Promise<SyncResult> {
    return upsertResilient(
      'eleves',
      {
        ...eleve,
        date_modification: new Date().toISOString(),
      },
      'matricule'
    );
  }

  static async syncElevesBatchToSupabase(eleves: Array<Record<string, unknown>>): Promise<SyncResult> {
    try {
      const cleaned = eleves.map(cleanRecordForPostgres);
      const { error } = await supabase.from('eleves').upsert(cleaned, { onConflict: 'matricule' });
      if (error) {
        console.warn('[Supabase Batch Eleves] Sync différée:', error.message);
        return { ok: false, error: error.message, code: error.code };
      }
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      console.warn('[Supabase Batch Eleves] Erreur:', msg);
      return { ok: false, error: msg };
    }
  }

  static async syncDemandeAdmissionToSupabase(demande: Record<string, unknown>): Promise<SyncResult> {
    return upsertResilient('demandes_admission', demande, 'id');
  }

  static async syncInscriptionAnnuelleToSupabase(inscription: {
    eleve_id: string;
    eleve_matricule: string;
    annee_scolaire: string;
    classe: string;
    scolarite_totale: number;
    montant_paye: number;
    statut_reinscription: string;
  }): Promise<SyncResult> {
    return upsertResilient('inscriptions_annuelles', inscription, 'eleve_id,annee_scolaire');
  }

  static async fetchDemandesAdmissionWithStatus(): Promise<FetchResult> {
    try {
      const { data, error } = await supabase
        .from('demandes_admission')
        .select('*')
        .order('date_demande', { ascending: false });

      if (error) {
        console.warn('[Supabase] Demandes d admission erreur:', error.message);
        return { data: null, error: error.message, code: error.code };
      }
      return { data: data || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      console.warn('[Supabase] Erreur fetch demandes:', msg);
      return { data: null, error: msg };
    }
  }

  static async fetchDemandesAdmissionFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchDemandesAdmissionWithStatus();
    return res.data;
  }

  static async fetchElevesWithStatus(): Promise<FetchResult> {
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('*')
        .order('date_creation', { ascending: false });

      if (error) {
        console.warn('[Supabase] Élèves erreur:', error.message);
        return { data: null, error: error.message, code: error.code };
      }
      return { data: data || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      console.warn('[Supabase] Erreur fetch eleves:', msg);
      return { data: null, error: msg };
    }
  }

  static async fetchElevesFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchElevesWithStatus();
    return res.data;
  }

  static async fetchPaiementsWithStatus(): Promise<FetchResult> {
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .order('date_paiement', { ascending: false });

      if (error) {
        console.warn('[Supabase] Paiements erreur:', error.message);
        return { data: null, error: error.message, code: error.code };
      }
      return { data: data || [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      console.warn('[Supabase] Erreur fetch paiements:', msg);
      return { data: null, error: msg };
    }
  }

  static async fetchPaiementsFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchPaiementsWithStatus();
    return res.data;
  }

  static async fetchAuditLogsFromSupabase(): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from('journal_activites')
        .select('*')
        .order('date_action', { ascending: false })
        .limit(100);

      if (error) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  static async syncAuditLogToSupabase(log: {
    id: string;
    date_action: string;
    type_action: string;
    auteur: string;
    description: string;
    details?: Record<string, unknown>;
    niveau_gravite: string;
  }): Promise<SyncResult> {
    return upsertResilient('journal_activites', log, 'id');
  }

  static async deleteEleveFromSupabase(studentId: string, matricule?: string) {
    try {
      let query = supabase.from('eleves').delete();
      if (matricule) {
        query = query.eq('matricule', matricule);
      } else {
        query = query.eq('id', studentId);
      }
      const { error } = await query;
      if (error) {
        console.warn('[Supabase Delete Eleve] Erreur:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Delete Eleve] Erreur réseau:', err);
      return false;
    }
  }
}
