const API_REQUEST_TIMEOUT_MS = 8000;

export const VERCEL_DB_LABEL = 'Vercel PostgreSQL (Neon)';
export const SUPABASE_PROJECT_ID = 'vercel-postgres';

// Jeton Bearer conservé uniquement en mémoire JS (jamais dans localStorage)
let adminBearerToken: string | null = null;

export function setSecretaryToken(token: string | null): void {
  adminBearerToken = token;
}

export function getSecretaryToken(): string | null {
  return adminBearerToken;
}

export function clearSecretaryToken(): void {
  adminBearerToken = null;
}

export interface SupabaseConnexionStatus {
  connecte: boolean;
  tablesExiste: boolean;
  configured?: boolean;
  envVarName?: string | null;
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

export interface FetchAllCloudResult {
  ok: boolean;
  notConfigured?: boolean;
  envVarName?: string | null;
  demandes?: any[];
  eleves?: any[];
  paiements?: any[];
  tarifs?: any[];
  auditLogs?: any[];
  error?: string;
}

async function apiFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_REQUEST_TIMEOUT_MS
): Promise<{ status: number; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (adminBearerToken) {
    headers['Authorization'] = `Bearer ${adminBearerToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: T;
    try {
      parsed = (text ? JSON.parse(text) : {}) as T;
    } catch {
      parsed = { ok: false, error: `Réponse serveur inattendue (HTTP ${response.status})` } as unknown as T;
    }
    return { status: response.status, data: parsed };
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      throw new Error(
        "Délai d'attente dépassé (8s) : le serveur Vercel / PostgreSQL ne répond pas."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function cleanRecordForPostgres(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined) continue;
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

function stripBulletinImg(payload: Record<string, unknown>): Record<string, unknown> {
  const obs = payload.observations_secretaire;
  if (typeof obs !== 'string' || !obs.includes('[BULLETIN_IMG]')) return payload;
  const strippedObs = obs.replace(/\[BULLETIN_IMG\][\s\S]*?\[\/BULLETIN_IMG\]\s*/g, '').trim();
  return {
    ...payload,
    observations_secretaire: strippedObs || null,
  };
}

async function upsertViaApi(table: string, rawPayload: Record<string, unknown>): Promise<SyncResult> {
  let payload = cleanRecordForPostgres(rawPayload);
  let imageStripped = false;
  const startedAt = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; error?: string; code?: string }>(
        '/api/db',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'upsert',
            table,
            record: payload,
          }),
        }
      );

      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true };
      }

      const msg = data?.error || `Erreur serveur HTTP ${status}`;
      if (
        table === 'demandes_admission' &&
        !imageStripped &&
        status >= 400 &&
        status !== 401 &&
        Date.now() - startedAt < 9000 &&
        typeof payload.observations_secretaire === 'string' &&
        payload.observations_secretaire.includes('[BULLETIN_IMG]')
      ) {
        imageStripped = true;
        payload = stripBulletinImg(payload);
        continue;
      }

      return { ok: false, error: msg, code: data?.code };
    } catch (err: unknown) {
      if (
        table === 'demandes_admission' &&
        !imageStripped &&
        Date.now() - startedAt < 9000 &&
        typeof payload.observations_secretaire === 'string' &&
        payload.observations_secretaire.includes('[BULLETIN_IMG]')
      ) {
        imageStripped = true;
        payload = stripBulletinImg(payload);
        continue;
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur réseau vers la base Vercel',
      };
    }
  }

  return { ok: false, error: `Échec de synchronisation sur ${table}.` };
}

export class SupabaseSyncService {
  static async verifySecretaryPin(
    pin: string
  ): Promise<{ ok: boolean; author?: string; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        token?: string;
        author?: string;
        error?: string;
      }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });

      if (status >= 200 && status < 300 && data?.ok && data.token) {
        setSecretaryToken(data.token);
        return { ok: true, author: data.author };
      }
      return { ok: false, error: data?.error || 'Code PIN incorrect.' };
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur de vérification du code PIN.',
      };
    }
  }

  static async testerConnexion(): Promise<SupabaseConnexionStatus> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        configured?: boolean;
        envVarName?: string | null;
        connected?: boolean;
        tablesReady?: boolean;
        message?: string;
        error?: string;
      }>('/api/db?action=health');

      if (status >= 200 && status < 300 && data) {
        return {
          connecte: Boolean(data.connected),
          tablesExiste: Boolean(data.tablesReady),
          configured: data.configured,
          envVarName: data.envVarName ?? null,
          message:
            data.message ||
            (data.configured
              ? 'Connexion Vercel PostgreSQL vérifiée.'
              : 'Base de données Vercel non encore reliée.'),
          details: data.error,
        };
      }

      return {
        connecte: false,
        tablesExiste: false,
        configured: data?.configured,
        envVarName: data?.envVarName ?? null,
        message: data?.message || data?.error || `Erreur serveur (HTTP ${status})`,
        details: data?.error,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return {
        connecte: false,
        tablesExiste: false,
        message: "Impossible de joindre le serveur API Vercel : " + msg,
      };
    }
  }

  static async initialiserTables(): Promise<SyncResult & { message?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/db',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'init' }),
        }
      );
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true, message: data.message };
      }
      return { ok: false, error: data?.error || `Erreur HTTP ${status}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async fetchAllFromCloud(anneeScolaire: string = '2027-2028'): Promise<FetchAllCloudResult> {
    try {
      const { status, data } = await apiFetchJson<FetchAllCloudResult>(
        `/api/db?action=fetch_all&annee=${encodeURIComponent(anneeScolaire)}`
      );
      if (status >= 200 && status < 300 && data?.ok) {
        return data;
      }
      return {
        ok: false,
        error: data?.error || `Impossible de charger les données (HTTP ${status})`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur réseau',
      };
    }
  }

  static async fetchTarifsFromSupabaseWithStatus(anneeScolaire: string = '2027-2028'): Promise<FetchResult> {
    const res = await this.fetchAllFromCloud(anneeScolaire);
    if (!res.ok) return { data: null, error: res.error };
    return { data: res.tarifs || [] };
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
    return upsertViaApi('tarifs_scolarite', {
      annee_scolaire: tarif.annee_scolaire,
      niveau: tarif.niveau,
      montant_scolarite: tarif.montant_scolarite,
      frais_inscription: tarif.frais_inscription,
      frais_annexes: tarif.frais_annexes,
      updated_at: new Date().toISOString(),
    });
  }

  static async syncPaiementToSupabase(payment: Record<string, unknown>): Promise<SyncResult> {
    return upsertViaApi('paiements', payment);
  }

  static async syncEleveToSupabase(eleve: Record<string, unknown>): Promise<SyncResult> {
    return upsertViaApi('eleves', {
      ...eleve,
      date_modification: new Date().toISOString(),
    });
  }

  static async syncElevesBatchToSupabase(eleves: Array<Record<string, unknown>>): Promise<SyncResult> {
    try {
      const cleaned = eleves.map(cleanRecordForPostgres);
      const { status, data } = await apiFetchJson<{ ok?: boolean; error?: string; code?: string }>(
        '/api/db',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'batch_upsert_eleves', records: cleaned }),
        }
      );
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true };
      }
      return { ok: false, error: data?.error || `Erreur HTTP ${status}`, code: data?.code };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async syncDemandeAdmissionToSupabase(demande: Record<string, unknown>): Promise<SyncResult> {
    return upsertViaApi('demandes_admission', demande);
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
    return upsertViaApi('inscriptions_annuelles', inscription);
  }

  static async fetchDemandesAdmissionWithStatus(): Promise<FetchResult> {
    const res = await this.fetchAllFromCloud();
    if (!res.ok) return { data: null, error: res.error };
    return { data: res.demandes || [] };
  }

  static async fetchDemandesAdmissionFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchDemandesAdmissionWithStatus();
    return res.data;
  }

  static async fetchElevesWithStatus(): Promise<FetchResult> {
    const res = await this.fetchAllFromCloud();
    if (!res.ok) return { data: null, error: res.error };
    return { data: res.eleves || [] };
  }

  static async fetchElevesFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchElevesWithStatus();
    return res.data;
  }

  static async fetchPaiementsWithStatus(): Promise<FetchResult> {
    const res = await this.fetchAllFromCloud();
    if (!res.ok) return { data: null, error: res.error };
    return { data: res.paiements || [] };
  }

  static async fetchPaiementsFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchPaiementsWithStatus();
    return res.data;
  }

  static async fetchAuditLogsFromSupabase(): Promise<any[] | null> {
    const res = await this.fetchAllFromCloud();
    return res.ok ? res.auditLogs || [] : null;
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
    return upsertViaApi('journal_activites', log);
  }

  static async deleteEleveFromSupabase(studentId: string, matricule?: string): Promise<boolean> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean }>('/api/db', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_eleve', studentId, matricule }),
      });
      return status >= 200 && status < 300 && Boolean(data?.ok);
    } catch (err) {
      console.warn('[Vercel DB Delete Eleve] Erreur réseau:', err);
      return false;
    }
  }
}

export const VercelDbService = SupabaseSyncService;
