import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pg from 'pg';

const { Pool } = pg;

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse extends ServerResponse {
  status?: (code: number) => ApiResponse;
  json?: (payload: unknown) => void;
}

export interface DatabaseConfig {
  url: string;
  envVarName: string;
}

const globalState = globalThis as unknown as {
  __paykalPgPool?: pg.Pool;
  __paykalPgPoolUrl?: string;
  __paykalSchemaPromise?: Promise<void>;
  __paykalEphemeralSecret?: Buffer;
};

export function getDatabaseConfig(): DatabaseConfig | null {
  const candidates = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'NEON_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
  ];

  for (const key of candidates) {
    const val = process.env[key];
    if (typeof val === 'string' && /^postgres(ql)?:\/\//i.test(val.trim())) {
      return { url: val.trim(), envVarName: key };
    }
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (
      (key.endsWith('_DATABASE_URL') || key.endsWith('_POSTGRES_URL')) &&
      typeof val === 'string' &&
      /^postgres(ql)?:\/\//i.test(val.trim())
    ) {
      return { url: val.trim(), envVarName: key };
    }
  }

  const pgHost = process.env.PGHOST?.trim() || process.env.POSTGRES_HOST?.trim();
  const pgUser = process.env.PGUSER?.trim() || process.env.POSTGRES_USER?.trim();
  const pgPass = process.env.PGPASSWORD?.trim() || process.env.POSTGRES_PASSWORD?.trim();
  const pgDb = process.env.PGDATABASE?.trim() || process.env.POSTGRES_DATABASE?.trim();
  if (pgHost && pgUser && pgPass && pgDb) {
    const built = `postgresql://${encodeURIComponent(pgUser)}:${encodeURIComponent(pgPass)}@${pgHost}/${encodeURIComponent(pgDb)}?sslmode=require&uselibpqcompat=true`;
    return { url: built, envVarName: process.env.PGHOST ? 'PGHOST/PGDATABASE' : 'POSTGRES_HOST/POSTGRES_DATABASE' };
  }

  return null;
}

export function getPool(): { pool: pg.Pool; envVarName: string } | null {
  const config = getDatabaseConfig();
  if (!config) return null;

  if (globalState.__paykalPgPool && globalState.__paykalPgPoolUrl === config.url) {
    return { pool: globalState.__paykalPgPool, envVarName: config.envVarName };
  }

  const isLocal =
    config.url.includes('localhost') ||
    config.url.includes('127.0.0.1') ||
    config.url.includes('sslmode=disable');

  let normalizedUrl = config.url;
  if (!isLocal) {
    try {
      const parsed = new URL(config.url);
      if (parsed.searchParams.get('sslmode') === 'require' && !parsed.searchParams.has('uselibpqcompat')) {
        parsed.searchParams.set('uselibpqcompat', 'true');
        normalizedUrl = parsed.toString();
      }
    } catch {
      // Keep original URL if custom syntax
    }
  }

  const pool = new Pool({
    connectionString: normalizedUrl,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 7000,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  globalState.__paykalPgPool = pool;
  globalState.__paykalPgPoolUrl = config.url;
  globalState.__paykalSchemaPromise = undefined;

  return { pool, envVarName: config.envVarName };
}

export async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!globalState.__paykalSchemaPromise) {
    globalState.__paykalSchemaPromise = runSchemaBootstrap(pool).catch((err) => {
      globalState.__paykalSchemaPromise = undefined;
      throw err;
    });
  }
  await globalState.__paykalSchemaPromise;
}

async function runSchemaBootstrap(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "unaccent";
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN CREATE TYPE type_mode_paiement AS ENUM ('ORANGE_MONEY', 'MOOV_MONEY', 'MTN_MONEY', 'LIGDICASH', 'ESPECES_GUICHET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_statut_paiement AS ENUM ('SUCCES', 'EN_COURS', 'ECHOUE', 'EN_ATTENTE_VERIFICATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN ALTER TYPE type_statut_paiement ADD VALUE IF NOT EXISTS 'EN_ATTENTE_VERIFICATION'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_statut_admission AS ENUM ('EN_ATTENTE', 'ACCEPTE', 'REFUSE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_canal_encaissement AS ENUM ('PARENT_EN_LIGNE', 'SECRETAIRE_GUICHET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_decision_bulletin AS ENUM ('PASSAGE', 'REDOUBLEMENT', 'NOUVEAU_CYCLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_statut_fin_annee AS ENUM ('PASSANT', 'REDOUBLANT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE type_statut_reinscription AS ENUM ('EN_ATTENTE_REINSCRIPTION', 'REINSCRIT', 'TRANSFERE', 'ABANDON'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        nom_complet VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        code_pin VARCHAR(50) NOT NULL DEFAULT '1234',
        role_utilisateur VARCHAR(50) NOT NULL DEFAULT 'SECRETAIRE',
        telephone VARCHAR(50),
        est_actif BOOLEAN NOT NULL DEFAULT TRUE,
        date_derniere_connexion TIMESTAMP WITH TIME ZONE,
        date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tarifs_scolarite (
        id SERIAL PRIMARY KEY,
        annee_scolaire VARCHAR(20) NOT NULL,
        niveau VARCHAR(50) NOT NULL,
        montant_scolarite NUMERIC(12, 2) NOT NULL CHECK (montant_scolarite >= 0),
        frais_inscription NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (frais_inscription >= 0),
        frais_annexes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (frais_annexes >= 0),
        total_exigible NUMERIC(12, 2) GENERATED ALWAYS AS (montant_scolarite + frais_inscription + frais_annexes) STORED,
        date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_tarifs_annee_niveau UNIQUE (annee_scolaire, niveau)
      );

      CREATE TABLE IF NOT EXISTS eleves (
        id VARCHAR(50) PRIMARY KEY,
        matricule VARCHAR(50) UNIQUE NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        sexe VARCHAR(10),
        date_naissance DATE,
        classe VARCHAR(50) NOT NULL,
        annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
        scolarite_totale NUMERIC(12, 2) NOT NULL DEFAULT 200000.00,
        montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        montant_don_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        nom_parent VARCHAR(150) NOT NULL,
        telephone_parent VARCHAR(50) NOT NULL,
        email_parent VARCHAR(150),
        adresse_domicile TEXT,
        annee_origine VARCHAR(20),
        classe_precedente VARCHAR(50),
        statut_fin_annee type_statut_fin_annee,
        statut_reinscription type_statut_reinscription DEFAULT 'REINSCRIT',
        decision_bulletin type_decision_bulletin DEFAULT 'PASSAGE',
        moyenne_annuelle NUMERIC(4, 2),
        etablissement_origine VARCHAR(255),
        motif_venue VARCHAR(100),
        description_motif TEXT,
        bulletin_nom_fichier VARCHAR(255),
        statut_inscription VARCHAR(20) NOT NULL DEFAULT 'inscrit',
        date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
        date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inscriptions_annuelles (
        id SERIAL PRIMARY KEY,
        eleve_id VARCHAR(50) NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
        eleve_matricule VARCHAR(50) NOT NULL,
        annee_scolaire VARCHAR(20) NOT NULL,
        classe VARCHAR(50) NOT NULL,
        scolarite_totale NUMERIC(12, 2) NOT NULL,
        montant_paye NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        statut_reinscription type_statut_reinscription NOT NULL DEFAULT 'REINSCRIT',
        date_validation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valide_par_utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
        CONSTRAINT uq_inscription_eleve_annee UNIQUE (eleve_id, annee_scolaire)
      );

      CREATE TABLE IF NOT EXISTS demandes_admission (
        id VARCHAR(50) PRIMARY KEY,
        date_demande TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
        nom_enfant VARCHAR(100) NOT NULL,
        prenom_enfant VARCHAR(100) NOT NULL,
        date_naissance DATE,
        classe_demandee VARCHAR(50) NOT NULL,
        nom_parent VARCHAR(150) NOT NULL,
        telephone_parent VARCHAR(50) NOT NULL,
        email_parent VARCHAR(150),
        adresse_domicile TEXT,
        est_nouvel_eleve BOOLEAN NOT NULL DEFAULT TRUE,
        etablissement_origine VARCHAR(255),
        decision_bulletin type_decision_bulletin NOT NULL DEFAULT 'PASSAGE',
        moyenne_annuelle NUMERIC(4, 2),
        motif_venue VARCHAR(100),
        description_motif TEXT NOT NULL,
        bulletin_nom_fichier VARCHAR(255),
        montant_don NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        statut_admission type_statut_admission NOT NULL DEFAULT 'EN_ATTENTE',
        matricule_attribue VARCHAR(50) REFERENCES eleves(matricule) ON DELETE SET NULL,
        observations_secretaire TEXT,
        motif_refus TEXT,
        date_traitement TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS paiements (
        id VARCHAR(50) PRIMARY KEY,
        reference_quittance VARCHAR(100) UNIQUE NOT NULL,
        annee_scolaire VARCHAR(20) NOT NULL DEFAULT '2027-2028',
        eleve_id VARCHAR(50) NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
        eleve_matricule VARCHAR(50) NOT NULL,
        nom_eleve VARCHAR(200) NOT NULL,
        classe_eleve VARCHAR(50) NOT NULL,
        montant_total NUMERIC(12, 2) NOT NULL CHECK (montant_total > 0),
        montant_scolarite NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        montant_don NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        mode_paiement type_mode_paiement NOT NULL,
        encaisse_par type_canal_encaissement NOT NULL,
        statut_paiement type_statut_paiement NOT NULL DEFAULT 'SUCCES',
        code_validation_otp VARCHAR(20),
        nom_payeur VARCHAR(150) NOT NULL,
        telephone_payeur VARCHAR(50),
        utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
        nom_agent VARCHAR(150),
        observations TEXT,
        date_paiement TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_activites (
        id VARCHAR(50) PRIMARY KEY,
        date_action TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        type_action VARCHAR(50) NOT NULL,
        auteur VARCHAR(150) NOT NULL DEFAULT 'Secrétaire Principale',
        description TEXT NOT NULL,
        details JSONB,
        niveau_gravite VARCHAR(20) NOT NULL DEFAULT 'INFO'
      );
    `);

    // Add missing columns safely for pre-existing tables
    await client.query(`
      ALTER TABLE demandes_admission ADD COLUMN IF NOT EXISTS motif_refus TEXT;
      ALTER TABLE paiements ADD COLUMN IF NOT EXISTS code_validation_otp VARCHAR(20);
      CREATE INDEX IF NOT EXISTS idx_demandes_statut ON demandes_admission(statut_admission);
      CREATE INDEX IF NOT EXISTS idx_demandes_date ON demandes_admission(date_demande);
      CREATE INDEX IF NOT EXISTS idx_eleves_matricule ON eleves(matricule);
      CREATE INDEX IF NOT EXISTS idx_paiements_eleve_id ON paiements(eleve_id);
      CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
      CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_activites(date_action DESC);
    `);

    await client.query(`
      INSERT INTO utilisateurs (nom_complet, email, code_pin, role_utilisateur, telephone)
      VALUES ('Secrétaire Principale', 'secretaire@excellence-avenir.bf', '1234', 'SECRETAIRE', '+226 70 00 11 22')
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO tarifs_scolarite (annee_scolaire, niveau, montant_scolarite, frais_inscription, frais_annexes)
      VALUES
        ('2027-2028', '6ème',       160000.00, 25000.00, 15000.00),
        ('2027-2028', '5ème',       160000.00, 25000.00, 15000.00),
        ('2027-2028', '4ème',       175000.00, 25000.00, 15000.00),
        ('2027-2028', '3ème',       190000.00, 30000.00, 20000.00),
        ('2027-2028', '2nde A',     210000.00, 30000.00, 20000.00),
        ('2027-2028', '2nde C',     215000.00, 30000.00, 20000.00),
        ('2027-2028', '1ère A',     225000.00, 35000.00, 20000.00),
        ('2027-2028', '1ère D',     230000.00, 35000.00, 20000.00),
        ('2027-2028', 'Tle A',      250000.00, 40000.00, 25000.00),
        ('2027-2028', 'Tle D',      260000.00, 40000.00, 25000.00),
        ('2027-2028', 'BEP 1',      200000.00, 35000.00, 30000.00),
        ('2027-2028', 'BEP 2',      210000.00, 35000.00, 30000.00),
        ('2027-2028', 'Bac Pro 1',  230000.00, 40000.00, 35000.00),
        ('2027-2028', 'Bac Pro 2',  245000.00, 40000.00, 35000.00),
        ('2027-2028', 'C''',        255000.00, 40000.00, 35000.00),
        ('2027-2028', 'D''',        265000.00, 40000.00, 35000.00)
      ON CONFLICT (annee_scolaire, niveau) DO NOTHING;
    `);
  } finally {
    client.release();
  }
}

function getSigningKey(): Buffer {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    return crypto.createHmac('sha256', configured).update('paykal-session-v1').digest();
  }
  const dbCfg = getDatabaseConfig();
  if (dbCfg) {
    return crypto.createHmac('sha256', dbCfg.url).update('paykal-session-v1').digest();
  }
  if (!globalState.__paykalEphemeralSecret) {
    globalState.__paykalEphemeralSecret = crypto.randomBytes(32);
  }
  return globalState.__paykalEphemeralSecret;
}

export function createSecretaryToken(author: string): string {
  const payload = {
    role: 'SECRETAIRE',
    author,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningKey()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySecretaryToken(req: ApiRequest): { valid: boolean; author?: string } {
  const rawAuth = req.headers['authorization'];
  const header = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!header || !header.startsWith('Bearer ')) {
    return { valid: false };
  }
  const token = header.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      role?: string;
      author?: string;
      exp?: number;
    };
    if (parsed.role !== 'SECRETAIRE' || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }
    return { valid: true, author: parsed.author || 'Secrétaire Principale' };
  } catch {
    return { valid: false };
  }
}

export function verifyPinConstantTime(inputPin: string, expectedPin: string): boolean {
  const a = crypto.createHash('sha256').update(inputPin).digest();
  const b = crypto.createHash('sha256').update(expectedPin).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sendJson(res: ApiResponse, statusCode: number, payload: unknown): void {
  if (typeof res.status === 'function') {
    const statusRes = res.status(statusCode);
    if (statusRes && typeof statusRes.json === 'function') {
      statusRes.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return await new Promise<Record<string, unknown>>((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= 2 * 1024 * 1024) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function readQueryParam(req: ApiRequest, key: string): string {
  if (req.query && req.query[key] !== undefined) {
    const val = req.query[key];
    return Array.isArray(val) ? String(val[0] || '') : String(val || '');
  }
  const rawUrl = req.url || '';
  try {
    const u = new URL(rawUrl, 'http://localhost');
    return u.searchParams.get(key) || '';
  } catch {
    return '';
  }
}
