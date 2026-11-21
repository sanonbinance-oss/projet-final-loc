import {
  type ApiRequest,
  type ApiResponse,
  ensureSchema,
  getPool,
  readJsonBody,
  readQueryParam,
  sendJson,
  verifySecretaryToken,
} from './_serverCore.ts';

type TableName =
  | 'tarifs_scolarite'
  | 'eleves'
  | 'inscriptions_annuelles'
  | 'demandes_admission'
  | 'paiements'
  | 'journal_activites';

interface TableSchemaConfig {
  conflictColumns: string[];
  allowedColumns: string[];
  dateColumns: Set<string>;
  numberColumns: Set<string>;
  jsonColumns: Set<string>;
  skipOnConflictUpdate: Set<string>;
}

const TABLE_SCHEMAS: Record<TableName, TableSchemaConfig> = {
  tarifs_scolarite: {
    conflictColumns: ['annee_scolaire', 'niveau'],
    allowedColumns: [
      'annee_scolaire',
      'niveau',
      'montant_scolarite',
      'frais_inscription',
      'frais_annexes',
      'updated_at',
    ],
    dateColumns: new Set(['updated_at']),
    numberColumns: new Set(['montant_scolarite', 'frais_inscription', 'frais_annexes']),
    jsonColumns: new Set(),
    skipOnConflictUpdate: new Set(['annee_scolaire', 'niveau']),
  },
  eleves: {
    conflictColumns: ['matricule'],
    allowedColumns: [
      'id',
      'matricule',
      'nom',
      'prenom',
      'sexe',
      'date_naissance',
      'classe',
      'annee_scolaire',
      'scolarite_totale',
      'montant_paye',
      'montant_don_total',
      'nom_parent',
      'telephone_parent',
      'email_parent',
      'adresse_domicile',
      'annee_origine',
      'classe_precedente',
      'statut_fin_annee',
      'statut_reinscription',
      'decision_bulletin',
      'moyenne_annuelle',
      'etablissement_origine',
      'motif_venue',
      'description_motif',
      'bulletin_nom_fichier',
      'statut_inscription',
      'date_inscription',
      'date_modification',
    ],
    dateColumns: new Set(['date_naissance', 'date_inscription', 'date_modification']),
    numberColumns: new Set(['scolarite_totale', 'montant_paye', 'montant_don_total', 'moyenne_annuelle']),
    jsonColumns: new Set(),
    skipOnConflictUpdate: new Set(['id', 'matricule']),
  },
  inscriptions_annuelles: {
    conflictColumns: ['eleve_id', 'annee_scolaire'],
    allowedColumns: [
      'eleve_id',
      'eleve_matricule',
      'annee_scolaire',
      'classe',
      'scolarite_totale',
      'montant_paye',
      'statut_reinscription',
      'date_validation',
    ],
    dateColumns: new Set(['date_validation']),
    numberColumns: new Set(['scolarite_totale', 'montant_paye']),
    jsonColumns: new Set(),
    skipOnConflictUpdate: new Set(['eleve_id', 'annee_scolaire']),
  },
  demandes_admission: {
    conflictColumns: ['id'],
    allowedColumns: [
      'id',
      'date_demande',
      'annee_scolaire',
      'nom_enfant',
      'prenom_enfant',
      'date_naissance',
      'classe_demandee',
      'nom_parent',
      'telephone_parent',
      'email_parent',
      'adresse_domicile',
      'est_nouvel_eleve',
      'etablissement_origine',
      'decision_bulletin',
      'moyenne_annuelle',
      'motif_venue',
      'description_motif',
      'bulletin_nom_fichier',
      'montant_don',
      'statut_admission',
      'matricule_attribue',
      'observations_secretaire',
      'motif_refus',
      'date_traitement',
    ],
    dateColumns: new Set(['date_demande', 'date_naissance', 'date_traitement']),
    numberColumns: new Set(['moyenne_annuelle', 'montant_don']),
    jsonColumns: new Set(),
    skipOnConflictUpdate: new Set(['id']),
  },
  paiements: {
    conflictColumns: ['id'],
    allowedColumns: [
      'id',
      'reference_quittance',
      'annee_scolaire',
      'eleve_id',
      'eleve_matricule',
      'nom_eleve',
      'classe_eleve',
      'montant_total',
      'montant_scolarite',
      'montant_don',
      'mode_paiement',
      'encaisse_par',
      'statut_paiement',
      'code_validation_otp',
      'nom_payeur',
      'telephone_payeur',
      'nom_agent',
      'observations',
      'date_paiement',
    ],
    dateColumns: new Set(['date_paiement']),
    numberColumns: new Set(['montant_total', 'montant_scolarite', 'montant_don']),
    jsonColumns: new Set(),
    skipOnConflictUpdate: new Set(['id']),
  },
  journal_activites: {
    conflictColumns: ['id'],
    allowedColumns: [
      'id',
      'date_action',
      'type_action',
      'auteur',
      'description',
      'details',
      'niveau_gravite',
    ],
    dateColumns: new Set(['date_action']),
    numberColumns: new Set(),
    jsonColumns: new Set(['details']),
    skipOnConflictUpdate: new Set(['id']),
  },
};

function sanitizeRecord(
  table: TableName,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const schema = TABLE_SCHEMAS[table];
  const cleaned: Record<string, unknown> = {};

  for (const col of schema.allowedColumns) {
    if (!(col in raw)) continue;
    const val = raw[col];
    if (val === undefined) continue;

    if (schema.dateColumns.has(col)) {
      if (val === '' || val === null) {
        cleaned[col] = null;
      } else {
        cleaned[col] = String(val);
      }
      continue;
    }

    if (schema.numberColumns.has(col)) {
      if (val === '' || val === null) {
        cleaned[col] = null;
      } else {
        const num = Number(val);
        cleaned[col] = Number.isFinite(num) ? num : null;
      }
      continue;
    }

    if (schema.jsonColumns.has(col)) {
      if (val === null) {
        cleaned[col] = null;
      } else if (typeof val === 'string') {
        cleaned[col] = val;
      } else {
        cleaned[col] = JSON.stringify(val);
      }
      continue;
    }

    cleaned[col] = val;
  }

  return cleaned;
}

function buildParameterizedUpsert(
  table: TableName,
  record: Record<string, unknown>,
  options?: { doNothingOnConflict?: boolean; whereClause?: string }
): { sql: string; values: unknown[] } {
  const schema = TABLE_SCHEMAS[table];
  const cols = schema.allowedColumns.filter((c) => c in record);
  const values = cols.map((c) => record[c]);
  const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
  const conflictTarget = schema.conflictColumns.join(', ');

  if (options?.doNothingOnConflict) {
    return {
      sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO NOTHING`,
      values,
    };
  }

  const updateCols = cols.filter((c) => !schema.skipOnConflictUpdate.has(c));
  if (updateCols.length === 0) {
    return {
      sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO NOTHING`,
      values,
    };
  }

  const updates = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
  const where = options?.whereClause ? ` WHERE ${options.whereClause}` : '';

  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}${where}`,
    values,
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const db = getPool();

  if (req.method === 'GET') {
    const action = readQueryParam(req, 'action') || 'health';

    if (!db) {
      sendJson(res, 200, {
        ok: false,
        configured: false,
        envVarName: null,
        connected: false,
        tablesReady: false,
        message:
          "Aucune variable DATABASE_URL ou POSTGRES_URL détectée. Connectez votre base Vercel Postgres (Neon) à ce projet dans Vercel Storage.",
      });
      return;
    }

    try {
      await db.pool.query('SELECT 1');
      await ensureSchema(db.pool);

      if (action === 'health') {
        const regCheck = await db.pool.query<{ ok: string | null }>(
          "SELECT to_regclass('public.demandes_admission')::text AS ok"
        );
        const tablesReady = Boolean(regCheck.rows[0]?.ok);
        sendJson(res, 200, {
          ok: true,
          configured: true,
          envVarName: db.envVarName,
          connected: true,
          tablesReady,
          message: tablesReady
            ? `Liaison 100% active avec Vercel PostgreSQL (${db.envVarName}) ! Les tables sont prêtes et synchronisées.`
            : "Connexion établie, création des tables en attente.",
        });
        return;
      }

      if (action === 'fetch_all') {
        const annee = readQueryParam(req, 'annee') || '2027-2028';
        const auth = verifySecretaryToken(req);

        const [demandesRes, elevesRes, paiementsRes, tarifsRes, auditRes] = await Promise.all([
          db.pool.query('SELECT * FROM demandes_admission ORDER BY date_demande DESC LIMIT 500'),
          db.pool.query('SELECT * FROM eleves ORDER BY date_creation DESC LIMIT 2000'),
          db.pool.query('SELECT * FROM paiements ORDER BY date_paiement DESC LIMIT 2000'),
          db.pool.query('SELECT * FROM tarifs_scolarite WHERE annee_scolaire = $1 ORDER BY id ASC', [annee]),
          auth.valid
            ? db.pool.query('SELECT * FROM journal_activites ORDER BY date_action DESC LIMIT 100')
            : Promise.resolve({ rows: [] }),
        ]);

        sendJson(res, 200, {
          ok: true,
          envVarName: db.envVarName,
          demandes: demandesRes.rows,
          eleves: elevesRes.rows,
          paiements: paiementsRes.rows,
          tarifs: tarifsRes.rows,
          auditLogs: auditRes.rows,
        });
        return;
      }

      sendJson(res, 400, { ok: false, error: 'Action GET inconnue.' });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur PostgreSQL inconnue';
      sendJson(res, 500, {
        ok: false,
        configured: true,
        envVarName: db.envVarName,
        connected: false,
        tablesReady: false,
        error: msg,
        message: `Erreur de communication avec Vercel PostgreSQL (${db.envVarName}) : ${msg}`,
      });
      return;
    }
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  if (!db) {
    sendJson(res, 503, {
      ok: false,
      notConfigured: true,
      error:
        "Base de données Vercel non reliée : connectez Neon / Postgres dans Vercel → Storage à votre projet puis redéployez.",
    });
    return;
  }

  const body = await readJsonBody(req);
  const action = typeof body.action === 'string' ? body.action : '';
  const auth = verifySecretaryToken(req);

  try {
    await ensureSchema(db.pool);

    if (action === 'init') {
      if (!auth.valid) {
        sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        envVarName: db.envVarName,
        message: 'Tables et tarifs initialisés avec succès sur Vercel PostgreSQL.',
      });
      return;
    }

    if (action === 'upsert') {
      const rawTable = typeof body.table === 'string' ? body.table : '';
      if (!(rawTable in TABLE_SCHEMAS)) {
        sendJson(res, 400, { ok: false, error: 'Table non autorisée.' });
        return;
      }
      const table = rawTable as TableName;
      const rawRecord =
        body.record && typeof body.record === 'object' && !Array.isArray(body.record)
          ? (body.record as Record<string, unknown>)
          : null;

      if (!rawRecord) {
        sendJson(res, 400, { ok: false, error: 'Enregistrement invalide.' });
        return;
      }

      // Contrôle d'accès par table
      const adminOnlyTables: TableName[] = ['eleves', 'inscriptions_annuelles', 'tarifs_scolarite'];
      if (!auth.valid && adminOnlyTables.includes(table)) {
        sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise pour cette opération.' });
        return;
      }

      let record = sanitizeRecord(table, rawRecord);
      let queryOptions: { doNothingOnConflict?: boolean; whereClause?: string } | undefined;

      if (!auth.valid) {
        if (table === 'demandes_admission') {
          record = {
            ...record,
            statut_admission: 'EN_ATTENTE',
            matricule_attribue: null,
            motif_refus: null,
            date_traitement: null,
          };
          queryOptions = { whereClause: "demandes_admission.statut_admission = 'EN_ATTENTE'" };
        } else if (table === 'paiements') {
          const requestedStatus = record.statut_paiement === 'EN_COURS' ? 'EN_COURS' : 'EN_ATTENTE_VERIFICATION';
          record = {
            ...record,
            statut_paiement: requestedStatus,
            encaisse_par: 'PARENT_EN_LIGNE',
            nom_agent: null,
          };
          queryOptions = { whereClause: "paiements.statut_paiement != 'SUCCES'" };
        } else if (table === 'journal_activites') {
          queryOptions = { doNothingOnConflict: true };
        }
      }

      try {
        const { sql, values } = buildParameterizedUpsert(table, record, queryOptions);
        await db.pool.query(sql, values);
        sendJson(res, 200, { ok: true });
        return;
      } catch (err: unknown) {
        const pgErr = err as { code?: string; message?: string };
        // Repli si clé étrangère matricule_attribue absente sur demandes_admission
        if (table === 'demandes_admission' && pgErr.code === '23503' && record.matricule_attribue) {
          const fallbackRecord = { ...record, matricule_attribue: null };
          const { sql, values } = buildParameterizedUpsert(table, fallbackRecord, queryOptions);
          await db.pool.query(sql, values);
          sendJson(res, 200, { ok: true });
          return;
        }
        throw err;
      }
    }

    if (action === 'batch_upsert_eleves') {
      if (!auth.valid) {
        sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
        return;
      }
      const records = Array.isArray(body.records) ? body.records : [];
      if (records.length === 0) {
        sendJson(res, 200, { ok: true, count: 0 });
        return;
      }

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of records) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
          const sanitized = sanitizeRecord('eleves', item as Record<string, unknown>);
          const { sql, values } = buildParameterizedUpsert('eleves', sanitized);
          await client.query(sql, values);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      sendJson(res, 200, { ok: true, count: records.length });
      return;
    }

    if (action === 'delete_eleve') {
      if (!auth.valid) {
        sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
        return;
      }
      const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
      const matricule = typeof body.matricule === 'string' ? body.matricule.trim() : '';

      if (matricule) {
        await db.pool.query('DELETE FROM eleves WHERE matricule = $1', [matricule]);
      } else if (studentId) {
        await db.pool.query('DELETE FROM eleves WHERE id = $1', [studentId]);
      } else {
        sendJson(res, 400, { ok: false, error: 'Identifiant élève requis.' });
        return;
      }

      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 400, { ok: false, error: 'Action POST inconnue.' });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    const msg = pgErr.message || 'Erreur base de données';
    console.warn('[API DB Error]', pgErr.code, msg);
    sendJson(res, 500, { ok: false, error: msg, code: pgErr.code });
  }
}
