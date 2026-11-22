import { ParentAccount, ReceiptVerificationResult, StaffRole, StaffSession, StaffUser } from '../types';

const API_REQUEST_TIMEOUT_MS = 8000;

export const VERCEL_DB_LABEL = 'Vercel PostgreSQL (Neon)';
export const SUPABASE_PROJECT_ID = 'vercel-postgres';

// Jetons Bearer conservés uniquement en mémoire JS (jamais dans localStorage ni sessionStorage)
let adminBearerToken: string | null = null;
let currentStaffSession: StaffSession | null = null;
let parentBearerToken: string | null = null;
let currentParentAccount: ParentAccount | null = null;
let activeAuthScope: 'parent' | 'staff' = 'parent';

export function setActiveAuthScope(scope: 'parent' | 'staff'): void {
  activeAuthScope = scope;
}

export function getActiveAuthScope(): 'parent' | 'staff' {
  return activeAuthScope;
}

export function setSecretaryToken(token: string | null, session?: StaffSession | null): void {
  adminBearerToken = token;
  if (session !== undefined) {
    currentStaffSession = session;
  } else if (!token) {
    currentStaffSession = null;
  }
}

export function getSecretaryToken(): string | null {
  return adminBearerToken;
}

export function getStaffSession(): StaffSession | null {
  return currentStaffSession;
}

export function clearSecretaryToken(): void {
  adminBearerToken = null;
  currentStaffSession = null;
}

export function setParentToken(token: string | null, account?: ParentAccount | null): void {
  parentBearerToken = token;
  if (account !== undefined) {
    currentParentAccount = account;
  } else if (!token) {
    currentParentAccount = null;
  }
}

export function getParentToken(): string | null {
  return parentBearerToken;
}

export function getParentAccount(): ParentAccount | null {
  return currentParentAccount;
}

export function clearParentToken(): void {
  parentBearerToken = null;
  currentParentAccount = null;
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
  scope?: 'STAFF' | 'PARENT' | 'PUBLIC';
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
  options: RequestInit & { tokenOverride?: string | null } = {},
  timeoutMs: number = API_REQUEST_TIMEOUT_MS
): Promise<{ status: number; data: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const { tokenOverride, ...fetchOptions } = options;
  const activeToken =
    tokenOverride !== undefined
      ? tokenOverride
      : activeAuthScope === 'staff'
      ? adminBearerToken
      : parentBearerToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
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
        "Délai d'attente dépassé (8s) : le serveur ne répond pas."
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

function stripHeavyInlineUrls(payload: Record<string, unknown>): Record<string, unknown> {
  const obs = payload.observations_secretaire;
  const strippedObs =
    typeof obs === 'string' && obs.includes('[BULLETIN_IMG]')
      ? obs.replace(/\[BULLETIN_IMG\][\s\S]*?\[\/BULLETIN_IMG\]\s*/g, '').trim()
      : obs;
  return {
    ...payload,
    observations_secretaire: strippedObs || null,
    bulletin_url: null,
    extrait_naissance_url: null,
  };
}

async function upsertViaApi(table: string, rawPayload: Record<string, unknown>): Promise<SyncResult> {
  let payload = cleanRecordForPostgres(rawPayload);
  let mediaStripped = false;
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
      const hasInlineMedia =
        Boolean(payload.bulletin_url) ||
        Boolean(payload.extrait_naissance_url) ||
        (typeof payload.observations_secretaire === 'string' &&
          payload.observations_secretaire.includes('[BULLETIN_IMG]'));

      if (
        table === 'demandes_admission' &&
        !mediaStripped &&
        status >= 400 &&
        status !== 401 &&
        status !== 403 &&
        Date.now() - startedAt < 9000 &&
        hasInlineMedia
      ) {
        mediaStripped = true;
        payload = stripHeavyInlineUrls(payload);
        continue;
      }

      return { ok: false, error: msg, code: data?.code };
    } catch (err: unknown) {
      const hasInlineMedia =
        Boolean(payload.bulletin_url) ||
        Boolean(payload.extrait_naissance_url) ||
        (typeof payload.observations_secretaire === 'string' &&
          payload.observations_secretaire.includes('[BULLETIN_IMG]'));

      if (
        table === 'demandes_admission' &&
        !mediaStripped &&
        Date.now() - startedAt < 9000 &&
        hasInlineMedia
      ) {
        mediaStripped = true;
        payload = stripHeavyInlineUrls(payload);
        continue;
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur réseau vers la base de données',
      };
    }
  }

  return { ok: false, error: `Échec de synchronisation sur ${table}.` };
}

export class SupabaseSyncService {
  // ---------------------------------------------------------------------------
  // AUTHENTIFICATION SECRÉTARIAT / ÉQUIPE
  // ---------------------------------------------------------------------------
  static async verifySecretaryPin(
    pin: string,
    email?: string
  ): Promise<{ ok: boolean; author?: string; staffRole?: StaffRole; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        token?: string;
        author?: string;
        staffRole?: StaffRole;
        email?: string;
        error?: string;
      }>('/api/auth', {
        method: 'POST',
        tokenOverride: null,
        body: JSON.stringify({ action: 'staff_login', pin, email: email || undefined }),
      });

      if (status >= 200 && status < 300 && data?.ok && data.token) {
        const session: StaffSession = {
          author: data.author || 'Secrétaire Principale',
          staffRole: data.staffRole || 'SECRETAIRE',
          email: data.email,
        };
        setSecretaryToken(data.token, session);
        return { ok: true, author: session.author, staffRole: session.staffRole };
      }
      return { ok: false, error: data?.error || 'Code PIN incorrect.' };
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur de vérification du code PIN.',
      };
    }
  }

  static async listStaffAccounts(): Promise<{ ok: boolean; staff?: StaffUser[]; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; staff?: StaffUser[]; error?: string }>(
        '/api/auth?action=list_staff',
        { tokenOverride: adminBearerToken }
      );
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true, staff: data.staff || [] };
      }
      return { ok: false, error: data?.error || 'Impossible de charger les comptes agents.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async createStaffAccount(payload: {
    nomComplet: string;
    email: string;
    role: StaffRole;
    pin: string;
    telephone?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; error?: string }>('/api/auth', {
        method: 'POST',
        tokenOverride: adminBearerToken,
        body: JSON.stringify({ action: 'create_staff', ...payload }),
      });
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true };
      }
      return { ok: false, error: data?.error || 'Erreur lors de la création.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async toggleStaffAccount(staffId: number, estActif: boolean): Promise<{ ok: boolean; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; error?: string }>('/api/auth', {
        method: 'POST',
        tokenOverride: adminBearerToken,
        body: JSON.stringify({ action: 'toggle_staff', staffId, estActif }),
      });
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true };
      }
      return { ok: false, error: data?.error || 'Impossible de modifier le statut.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async updateOwnStaffPin(currentPin: string, newPin: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; error?: string }>('/api/auth', {
        method: 'POST',
        tokenOverride: adminBearerToken,
        body: JSON.stringify({ action: 'update_own_pin', currentPin, newPin }),
      });
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true };
      }
      return { ok: false, error: data?.error || 'Impossible de modifier le code PIN.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  // ---------------------------------------------------------------------------
  // AUTHENTIFICATION & ESPACE PRIVÉ PARENT
  // ---------------------------------------------------------------------------
  static async registerParentAccount(payload: {
    nomComplet: string;
    telephone: string;
    email?: string;
    password: string;
  }): Promise<{ ok: boolean; parent?: ParentAccount; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        token?: string;
        parent?: ParentAccount;
        error?: string;
      }>('/api/auth', {
        method: 'POST',
        tokenOverride: null,
        body: JSON.stringify({ action: 'parent_register', ...payload }),
      });

      if (status >= 200 && status < 300 && data?.ok && data.token && data.parent) {
        setParentToken(data.token, data.parent);
        return { ok: true, parent: data.parent };
      }
      return { ok: false, error: data?.error || 'Création de compte impossible.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async loginParentAccount(payload: {
    telephone: string;
    password: string;
  }): Promise<{ ok: boolean; parent?: ParentAccount; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        token?: string;
        parent?: ParentAccount;
        error?: string;
      }>('/api/auth', {
        method: 'POST',
        tokenOverride: null,
        body: JSON.stringify({ action: 'parent_login', ...payload }),
      });

      if (status >= 200 && status < 300 && data?.ok && data.token && data.parent) {
        setParentToken(data.token, data.parent);
        return { ok: true, parent: data.parent };
      }
      return { ok: false, error: data?.error || 'Identifiants incorrects.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async linkChildToParentAccount(
    matricule: string,
    telephoneParent: string
  ): Promise<{ ok: boolean; studentName?: string; matricule?: string; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        studentName?: string;
        matricule?: string;
        error?: string;
      }>('/api/db', {
        method: 'POST',
        tokenOverride: parentBearerToken,
        body: JSON.stringify({ action: 'link_child', matricule, telephoneParent }),
      });

      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true, studentName: data.studentName, matricule: data.matricule };
      }
      return { ok: false, error: data?.error || 'Impossible de rattacher cet élève.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  static async parentReenrollStudent(payload: {
    studentId: string;
    targetClass: string;
    nomParent: string;
    telephoneParent: string;
    anneeScolaire?: string;
  }): Promise<{ ok: boolean; scolariteTotale?: number; error?: string }> {
    try {
      const { status, data } = await apiFetchJson<{
        ok?: boolean;
        scolariteTotale?: number;
        error?: string;
      }>('/api/db', {
        method: 'POST',
        tokenOverride: parentBearerToken,
        body: JSON.stringify({ action: 'parent_reenroll', ...payload }),
      });
      if (status >= 200 && status < 300 && data?.ok) {
        return { ok: true, scolariteTotale: data.scolariteTotale };
      }
      return { ok: false, error: data?.error || 'Erreur lors de la réinscription.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  // ---------------------------------------------------------------------------
  // VÉRIFICATION QR D'UNE QUITTANCE (ANTI-FRAUDE)
  // ---------------------------------------------------------------------------
  static async verifyReceiptQr(
    ref: string,
    sig?: string
  ): Promise<{ ok: boolean; result?: ReceiptVerificationResult; error?: string }> {
    try {
      const qs = new URLSearchParams({ action: 'verify_receipt', ref: ref.trim() });
      if (sig?.trim()) qs.set('sig', sig.trim());
      const { status, data } = await apiFetchJson<ReceiptVerificationResult & { ok?: boolean; error?: string }>(
        `/api/db?${qs.toString()}`,
        { tokenOverride: null }
      );
      if (status >= 200 && status < 300 && data?.ok) {
        return {
          ok: true,
          result: {
            found: data.found,
            authentic: data.authentic,
            signatureValid: data.signatureValid,
            receipt: data.receipt,
          },
        };
      }
      return { ok: false, error: data?.error || 'Vérification impossible.' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' };
    }
  }

  // ---------------------------------------------------------------------------
  // SYNCHRONISATION BASE POSTGRESQL
  // ---------------------------------------------------------------------------
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
              ? 'Connexion PostgreSQL vérifiée.'
              : 'Base de données non encore reliée.'),
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
        message: 'Impossible de joindre le serveur API : ' + msg,
      };
    }
  }

  static async initialiserTables(): Promise<SyncResult & { message?: string }> {
    try {
      const { status, data } = await apiFetchJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/db',
        {
          method: 'POST',
          tokenOverride: adminBearerToken,
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
      const scopeParam = activeAuthScope === 'parent' ? '&scope=parent' : '&scope=staff';
      const { status, data } = await apiFetchJson<FetchAllCloudResult>(
        `/api/db?action=fetch_all&annee=${encodeURIComponent(anneeScolaire)}${scopeParam}`
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
          tokenOverride: adminBearerToken,
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
        tokenOverride: adminBearerToken,
        body: JSON.stringify({ action: 'delete_eleve', studentId, matricule }),
      });
      return status >= 200 && status < 300 && Boolean(data?.ok);
    } catch (err) {
      console.warn('[Delete Eleve] Erreur réseau:', err);
      return false;
    }
  }
}

export const VercelDbService = SupabaseSyncService;
