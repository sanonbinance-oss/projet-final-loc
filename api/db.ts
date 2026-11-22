import {
  type ApiRequest,
  type ApiResponse,
  ensureSchema,
  getPool,
  normalizePhone,
  readJsonBody,
  readQueryParam,
  sendJson,
  signReceiptReference,
  verifyReceiptSignature,
  verifySessionToken,
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
      'parent_compte_id',
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
      'extrait_naissance_nom_fichier',
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
      'parent_compte_id',
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
      'bulletin_url',
      'extrait_naissance_nom_fichier',
      'extrait_naissance_url',
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
      'parent_compte_id',
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
  options?: { doNothingOnConflict?: boolean }
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

  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}`,
    values,
  };
}

function enrichPaymentRowsWithQr(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const ref = String(row.reference_quittance || '');
    const mat = String(row.eleve_matricule || '');
    const montant = Number(row.montant_total || 0);
    return {
      ...row,
      qr_signature: ref ? signReceiptReference(ref, mat, montant) : undefined,
    };
  });
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
        message: 'Base de données non configurée.',
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
          message: tablesReady ? 'Connexion active.' : 'Création des tables en attente.',
        });
        return;
      }

      if (action === 'verify_receipt') {
        const ref = readQueryParam(req, 'ref').trim();
        const sig = readQueryParam(req, 'sig').trim();
        if (!ref) {
          sendJson(res, 400, { ok: false, error: 'Référence de quittance requise.' });
          return;
        }

        const found = await db.pool.query<{
          reference_quittance: string;
          annee_scolaire: string;
          eleve_matricule: string;
          nom_eleve: string;
          classe_eleve: string;
          montant_total: string | number;
          montant_scolarite: string | number;
          montant_don: string | number;
          mode_paiement: string;
          encaisse_par: string;
          statut_paiement: string;
          nom_agent: string | null;
          date_paiement: string;
        }>(
          `SELECT reference_quittance, annee_scolaire, eleve_matricule, nom_eleve, classe_eleve,
                  montant_total, montant_scolarite, montant_don, mode_paiement, encaisse_par,
                  statut_paiement, nom_agent, date_paiement
           FROM paiements
           WHERE UPPER(reference_quittance) = UPPER($1)
           LIMIT 1`,
          [ref]
        );

        if (found.rows.length === 0) {
          sendJson(res, 200, {
            ok: true,
            found: false,
            authentic: false,
            signatureValid: false,
            receipt: null,
          });
          return;
        }

        const r = found.rows[0];
        const total = Number(r.montant_total || 0);
        const sigValid = sig
          ? verifyReceiptSignature(r.reference_quittance, r.eleve_matricule, total, sig)
          : true;

        sendJson(res, 200, {
          ok: true,
          found: true,
          authentic: r.statut_paiement === 'SUCCES' && sigValid,
          signatureValid: sigValid,
          receipt: {
            reference: r.reference_quittance,
            anneeScolaire: r.annee_scolaire,
            studentMatricule: r.eleve_matricule,
            studentNom: r.nom_eleve,
            studentClasse: r.classe_eleve,
            montant: total,
            montantScolarite: Number(r.montant_scolarite || 0),
            montantDon: Number(r.montant_don || 0),
            mode: r.mode_paiement,
            encaissePar: r.encaisse_par,
            statut: r.statut_paiement,
            agentNom: r.nom_agent || (r.encaisse_par === 'SECRETAIRE_GUICHET' ? 'Secrétariat' : 'Paiement en ligne'),
            date: r.date_paiement,
          },
        });
        return;
      }

      if (action === 'fetch_all') {
        const annee = readQueryParam(req, 'annee') || '2027-2028';
        const session = verifySessionToken(req);
        const requestedScope = readQueryParam(req, 'scope'); // 'parent' | 'staff' | ''

        const tarifsPromise = db.pool.query(
          'SELECT * FROM tarifs_scolarite WHERE annee_scolaire = $1 ORDER BY id ASC',
          [annee]
        );

        if (session.valid && session.type === 'STAFF' && requestedScope !== 'parent') {
          const [demandesRes, elevesRes, paiementsRes, tarifsRes, auditRes] = await Promise.all([
            db.pool.query('SELECT * FROM demandes_admission ORDER BY date_demande DESC LIMIT 500'),
            db.pool.query('SELECT * FROM eleves ORDER BY date_creation DESC LIMIT 2000'),
            db.pool.query('SELECT * FROM paiements ORDER BY date_paiement DESC LIMIT 2000'),
            tarifsPromise,
            db.pool.query('SELECT * FROM journal_activites ORDER BY date_action DESC LIMIT 100'),
          ]);

          sendJson(res, 200, {
            ok: true,
            scope: 'STAFF',
            envVarName: db.envVarName,
            demandes: demandesRes.rows,
            eleves: elevesRes.rows,
            paiements: enrichPaymentRowsWithQr(paiementsRes.rows),
            tarifs: tarifsRes.rows,
            auditLogs: auditRes.rows,
          });
          return;
        }

        if (session.valid && session.type === 'PARENT' && session.userId) {
          const [demandesRes, elevesRes, paiementsRes, tarifsRes] = await Promise.all([
            db.pool.query(
              'SELECT * FROM demandes_admission WHERE parent_compte_id = $1 ORDER BY date_demande DESC LIMIT 200',
              [session.userId]
            ),
            db.pool.query(
              'SELECT * FROM eleves WHERE parent_compte_id = $1 ORDER BY date_creation DESC LIMIT 200',
              [session.userId]
            ),
            db.pool.query(
              `SELECT * FROM paiements
               WHERE parent_compte_id = $1
                  OR eleve_id IN (SELECT id FROM eleves WHERE parent_compte_id = $1)
               ORDER BY date_paiement DESC
               LIMIT 500`,
              [session.userId]
            ),
            tarifsPromise,
          ]);

          sendJson(res, 200, {
            ok: true,
            scope: 'PARENT',
            envVarName: db.envVarName,
            demandes: demandesRes.rows,
            eleves: elevesRes.rows,
            paiements: enrichPaymentRowsWithQr(paiementsRes.rows),
            tarifs: tarifsRes.rows,
            auditLogs: [],
          });
          return;
        }

        // Unauthenticated visitors ONLY see public tariffs (zero personal student/admission/message data)
        const tarifsRes = await tarifsPromise;
        sendJson(res, 200, {
          ok: true,
          scope: 'PUBLIC',
          envVarName: db.envVarName,
          demandes: [],
          eleves: [],
          paiements: [],
          tarifs: tarifsRes.rows,
          auditLogs: [],
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
      error: 'Base de données non configurée.',
    });
    return;
  }

  const body = await readJsonBody(req);
  const action = typeof body.action === 'string' ? body.action : '';
  const session = verifySessionToken(req);
  const isStaff = session.valid && session.type === 'STAFF';
  const isParent = session.valid && session.type === 'PARENT';

  try {
    await ensureSchema(db.pool);

    if (action === 'init') {
      if (!isStaff) {
        sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        envVarName: db.envVarName,
        message: 'Tables et tarifs initialisés avec succès.',
      });
      return;
    }

    if (action === 'link_child') {
      if (!isParent || !session.userId) {
        sendJson(res, 401, { ok: false, error: 'Veuillez vous connecter à votre espace parent.' });
        return;
      }
      const matricule = typeof body.matricule === 'string' ? body.matricule.trim() : '';
      const telephoneParent = typeof body.telephoneParent === 'string' ? body.telephoneParent.trim() : '';
      const normInputTel = normalizePhone(telephoneParent);

      if (!matricule || normInputTel.length < 8) {
        sendJson(res, 400, { ok: false, error: 'Matricule et numéro de téléphone du parent requis.' });
        return;
      }

      const stuRes = await db.pool.query<{
        id: string;
        matricule: string;
        nom: string;
        prenom: string;
        telephone_parent: string;
        parent_compte_id: string | null;
      }>(
        `SELECT id, matricule, nom, prenom, telephone_parent, parent_compte_id
         FROM eleves
         WHERE UPPER(matricule) = UPPER($1)
         LIMIT 1`,
        [matricule]
      );

      if (stuRes.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Aucun élève trouvé avec ce matricule.' });
        return;
      }

      const stu = stuRes.rows[0];
      const normStoredTel = normalizePhone(stu.telephone_parent || '');
      if (!normStoredTel || normStoredTel !== normInputTel) {
        sendJson(res, 403, {
          ok: false,
          error: 'Le numéro de téléphone ne correspond pas au dossier enregistré à l’école.',
        });
        return;
      }

      if (stu.parent_compte_id && stu.parent_compte_id !== session.userId) {
        sendJson(res, 403, {
          ok: false,
          error: 'Cet élève est déjà rattaché à un autre espace parent.',
        });
        return;
      }

      await db.pool.query('UPDATE eleves SET parent_compte_id = $1 WHERE id = $2', [session.userId, stu.id]);
      await db.pool.query(
        'UPDATE paiements SET parent_compte_id = $1 WHERE eleve_id = $2 AND parent_compte_id IS NULL',
        [session.userId, stu.id]
      );

      sendJson(res, 200, {
        ok: true,
        matricule: stu.matricule,
        studentName: `${stu.prenom} ${stu.nom}`,
      });
      return;
    }

    if (action === 'parent_reenroll') {
      if (!isParent || !session.userId) {
        sendJson(res, 401, { ok: false, error: 'Authentification parent requise.' });
        return;
      }
      const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
      const targetClass = typeof body.targetClass === 'string' ? body.targetClass.trim() : '';
      const nomParent = typeof body.nomParent === 'string' ? body.nomParent.trim() : '';
      const telephoneParent = typeof body.telephoneParent === 'string' ? body.telephoneParent.trim() : '';
      const anneeScolaire = typeof body.anneeScolaire === 'string' ? body.anneeScolaire.trim() : '2027-2028';

      if (!studentId || !targetClass) {
        sendJson(res, 400, { ok: false, error: 'Élève et classe cible requis.' });
        return;
      }

      const stuRes = await db.pool.query<{
        id: string;
        matricule: string;
        parent_compte_id: string | null;
        montant_paye: string | number;
      }>('SELECT id, matricule, parent_compte_id, montant_paye FROM eleves WHERE id = $1 LIMIT 1', [studentId]);

      if (stuRes.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Élève introuvable.' });
        return;
      }
      const stu = stuRes.rows[0];
      if (stu.parent_compte_id !== session.userId) {
        sendJson(res, 403, { ok: false, error: 'Accès refusé à ce dossier élève.' });
        return;
      }

      const tarifRes = await db.pool.query<{ total_exigible: string | number }>(
        'SELECT total_exigible FROM tarifs_scolarite WHERE annee_scolaire = $1 AND niveau = $2 LIMIT 1',
        [anneeScolaire, targetClass]
      );
      const officialTotal = tarifRes.rows[0] ? Number(tarifRes.rows[0].total_exigible) : 200000;

      await db.pool.query(
        `UPDATE eleves
         SET classe = $1,
             annee_scolaire = $2,
             scolarite_totale = $3,
             statut_reinscription = 'REINSCRIT',
             nom_parent = COALESCE(NULLIF($4, ''), nom_parent),
             telephone_parent = COALESCE(NULLIF($5, ''), telephone_parent),
             date_modification = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [targetClass, anneeScolaire, officialTotal, nomParent, telephoneParent, stu.id]
      );

      await db.pool.query(
        `INSERT INTO inscriptions_annuelles (eleve_id, eleve_matricule, annee_scolaire, classe, scolarite_totale, montant_paye, statut_reinscription)
         VALUES ($1, $2, $3, $4, $5, $6, 'REINSCRIT')
         ON CONFLICT (eleve_id, annee_scolaire)
         DO UPDATE SET classe = EXCLUDED.classe, scolarite_totale = EXCLUDED.scolarite_totale, statut_reinscription = 'REINSCRIT'`,
        [stu.id, stu.matricule, anneeScolaire, targetClass, officialTotal, Number(stu.montant_paye || 0)]
      );

      sendJson(res, 200, { ok: true, scolariteTotale: officialTotal });
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

      if (!session.valid) {
        sendJson(res, 401, {
          ok: false,
          error: 'Veuillez vous connecter pour enregistrer cette opération.',
        });
        return;
      }

      const staffOnlyTables: TableName[] = ['eleves', 'inscriptions_annuelles', 'tarifs_scolarite'];
      if (!isStaff && staffOnlyTables.includes(table)) {
        sendJson(res, 403, { ok: false, error: 'Accès réservé au secrétariat.' });
        return;
      }

      let record = sanitizeRecord(table, rawRecord);
      let queryOptions: { doNothingOnConflict?: boolean } | undefined;

      if (!isStaff && isParent && session.userId) {
        if (table === 'demandes_admission') {
          const recId = String(record.id || '');
          if (recId) {
            const existing = await db.pool.query<{ parent_compte_id: string | null; statut_admission: string }>(
              'SELECT parent_compte_id, statut_admission FROM demandes_admission WHERE id = $1 LIMIT 1',
              [recId]
            );
            if (existing.rows.length > 0) {
              const row = existing.rows[0];
              if (row.parent_compte_id && row.parent_compte_id !== session.userId) {
                sendJson(res, 403, { ok: false, error: 'Ce dossier appartient à un autre espace parent.' });
                return;
              }
              if (row.statut_admission !== 'EN_ATTENTE') {
                sendJson(res, 403, { ok: false, error: 'Un dossier déjà traité ne peut plus être modifié.' });
                return;
              }
            }
          }

          record = {
            ...record,
            parent_compte_id: session.userId,
            statut_admission: 'EN_ATTENTE',
            matricule_attribue: null,
            motif_refus: null,
            date_traitement: null,
          };
        } else if (table === 'paiements') {
          const eleveId = String(record.eleve_id || '');
          if (!eleveId) {
            sendJson(res, 400, { ok: false, error: 'Élève manquant.' });
            return;
          }
          const eleveRes = await db.pool.query<{ id: string; parent_compte_id: string | null }>(
            'SELECT id, parent_compte_id FROM eleves WHERE id = $1 LIMIT 1',
            [eleveId]
          );
          if (eleveRes.rows.length === 0 || eleveRes.rows[0].parent_compte_id !== session.userId) {
            sendJson(res, 403, { ok: false, error: "Vous ne pouvez payer que pour les élèves de votre espace." });
            return;
          }

          const payId = String(record.id || '');
          if (payId) {
            const existingPay = await db.pool.query<{ statut_paiement: string; parent_compte_id: string | null }>(
              'SELECT statut_paiement, parent_compte_id FROM paiements WHERE id = $1 LIMIT 1',
              [payId]
            );
            if (existingPay.rows.length > 0) {
              const ep = existingPay.rows[0];
              if (ep.parent_compte_id && ep.parent_compte_id !== session.userId) {
                sendJson(res, 403, { ok: false, error: 'Transaction non autorisée.' });
                return;
              }
              if (ep.statut_paiement === 'SUCCES') {
                sendJson(res, 403, { ok: false, error: 'Une transaction validée ne peut pas être modifiée.' });
                return;
              }
            }
          }

          record = {
            ...record,
            parent_compte_id: session.userId,
            statut_paiement: 'EN_ATTENTE_VERIFICATION',
            encaisse_par: 'PARENT_EN_LIGNE',
            nom_agent: null,
          };
        } else if (table === 'journal_activites') {
          record = {
            ...record,
            auteur: session.author || 'Parent',
          };
          queryOptions = { doNothingOnConflict: true };
        }
      } else if (isStaff) {
        if (table === 'paiements') {
          if (!record.nom_agent && record.statut_paiement === 'SUCCES' && session.author) {
            record.nom_agent = session.author;
          }
          if (!record.parent_compte_id && record.eleve_id) {
            const stuOwner = await db.pool.query<{ parent_compte_id: string | null }>(
              'SELECT parent_compte_id FROM eleves WHERE id = $1 LIMIT 1',
              [String(record.eleve_id)]
            );
            if (stuOwner.rows[0]?.parent_compte_id) {
              record.parent_compte_id = stuOwner.rows[0].parent_compte_id;
            }
          }
        }
        if (table === 'eleves' && !record.parent_compte_id && record.matricule) {
          const admOwner = await db.pool.query<{ parent_compte_id: string | null }>(
            'SELECT parent_compte_id FROM demandes_admission WHERE matricule_attribue = $1 LIMIT 1',
            [String(record.matricule)]
          );
          if (admOwner.rows[0]?.parent_compte_id) {
            record.parent_compte_id = admOwner.rows[0].parent_compte_id;
          }
        }
        if (table === 'journal_activites' && session.author && !record.auteur) {
          record.auteur = session.author;
        }
      }

      try {
        const { sql, values } = buildParameterizedUpsert(table, record, queryOptions);
        await db.pool.query(sql, values);
        sendJson(res, 200, { ok: true });
        return;
      } catch (err: unknown) {
        const pgErr = err as { code?: string; message?: string };
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
      if (!isStaff) {
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
      if (!isStaff) {
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

    if (action === 'reset_demo_data') {
      if (!isStaff || session.staffRole !== 'DIRECTEUR') {
        sendJson(res, 403, {
          ok: false,
          error: 'Seule la Direction peut réinitialiser la base pour passer en données réelles.',
        });
        return;
      }

      const includeParents = Boolean(body.includeParents);
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM paiements');
        await client.query('DELETE FROM inscriptions_annuelles');
        await client.query('DELETE FROM demandes_admission');
        await client.query('DELETE FROM eleves');
        await client.query('DELETE FROM fichiers_documents');
        await client.query('DELETE FROM journal_activites');
        if (includeParents) {
          await client.query('DELETE FROM reinitialisations_mdp');
          await client.query('DELETE FROM comptes_parents');
        }
        await client.query(
          `INSERT INTO journal_activites (id, type_action, auteur, description, details, niveau_gravite)
           VALUES ($1, 'INIT_BASE', $2, $3, $4, 'INFO')`,
          [
            'LOG_INIT_' + Date.now(),
            session.author || 'Direction',
            includeParents
              ? 'Nettoyage complet effectué (élèves, demandes, paiements, pièces et comptes parents) : base prête pour les données réelles.'
              : 'Nettoyage opérationnel effectué (élèves, demandes, paiements et pièces) : base prête pour les données réelles.',
            JSON.stringify({ includeParents }),
          ]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      sendJson(res, 200, {
        ok: true,
        includeParents,
        message: 'Base nettoyée et prête pour les données réelles.',
      });
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
