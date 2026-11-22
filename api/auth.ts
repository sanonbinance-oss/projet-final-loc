import crypto from 'node:crypto';
import {
  type ApiRequest,
  type ApiResponse,
  type StaffRole,
  createSecretaryToken,
  createSessionToken,
  ensureSchema,
  getPool,
  hashSecret,
  normalizePhone,
  readJsonBody,
  readQueryParam,
  sendJson,
  verifyPinConstantTime,
  verifySecret,
  verifySecretaryToken,
  verifySessionToken,
} from './_serverCore.ts';

const ALLOWED_STAFF_ROLES: StaffRole[] = ['DIRECTEUR', 'SECRETAIRE', 'CAISSIER'];

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const db = getPool();

  if (req.method === 'GET') {
    const action = readQueryParam(req, 'action');
    if (action === 'list_staff') {
      const staffAuth = verifySecretaryToken(req);
      if (!staffAuth.valid) {
        sendJson(res, 401, { ok: false, error: 'Authentification administrative requise.' });
        return;
      }
      if (!db) {
        sendJson(res, 200, { ok: true, staff: [] });
        return;
      }
      try {
        await ensureSchema(db.pool);
        const rowsRes = await db.pool.query<{
          id: number;
          nom_complet: string;
          email: string;
          role_utilisateur: string;
          telephone: string | null;
          est_actif: boolean;
          date_derniere_connexion: string | null;
          date_creation: string;
        }>(
          `SELECT id, nom_complet, email, role_utilisateur, telephone, est_actif, date_derniere_connexion, date_creation
           FROM utilisateurs
           ORDER BY id ASC`
        );
        sendJson(res, 200, {
          ok: true,
          staff: rowsRes.rows.map((r) => ({
            id: r.id,
            nomComplet: r.nom_complet,
            email: r.email,
            role: r.role_utilisateur,
            telephone: r.telephone || '',
            estActif: r.est_actif,
            dateDerniereConnexion: r.date_derniere_connexion,
            dateCreation: r.date_creation,
          })),
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lecture équipe';
        sendJson(res, 500, { ok: false, error: msg });
        return;
      }
    }

    if (action === 'list_parents') {
      const staffAuth = verifySecretaryToken(req);
      if (!staffAuth.valid) {
        sendJson(res, 401, { ok: false, error: 'Authentification administrative requise.' });
        return;
      }
      if (!db) {
        sendJson(res, 200, { ok: true, parents: [] });
        return;
      }
      try {
        await ensureSchema(db.pool);
        const rowsRes = await db.pool.query<{
          id: string;
          nom_complet: string;
          telephone: string;
          email: string | null;
          est_actif: boolean;
          date_creation: string;
        }>(
          `SELECT id, nom_complet, telephone, email, est_actif, date_creation
           FROM comptes_parents
           ORDER BY date_creation DESC
           LIMIT 200`
        );
        sendJson(res, 200, {
          ok: true,
          parents: rowsRes.rows.map((p) => ({
            id: p.id,
            nomComplet: p.nom_complet,
            telephone: p.telephone,
            email: p.email || undefined,
            estActif: p.est_actif,
            dateCreation: p.date_creation,
          })),
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lecture comptes parents';
        sendJson(res, 500, { ok: false, error: msg });
        return;
      }
    }

    if (action === 'validate_token') {
      const session = verifySessionToken(req);
      if (!session.valid || !session.userId) {
        sendJson(res, 401, {
          ok: false,
          valid: false,
          authenticated: false,
          error: 'Jeton de session absent, expiré ou invalide.',
        });
        return;
      }

      const expectedType = readQueryParam(req, 'expectedType').trim().toUpperCase();
      if (expectedType && session.type !== expectedType) {
        sendJson(res, 403, {
          ok: false,
          valid: false,
          authenticated: false,
          error: 'Type de session non autorisé pour cet espace.',
        });
        return;
      }

      const expectedUserId =
        readQueryParam(req, 'expectedParentId').trim() || readQueryParam(req, 'expectedUserId').trim();
      if (expectedUserId && session.userId !== expectedUserId) {
        sendJson(res, 403, {
          ok: false,
          valid: false,
          authenticated: false,
          error: 'Accès inter-utilisateurs refusé : propriétaire du jeton non concordant.',
        });
        return;
      }

      if (session.type === 'PARENT') {
        if (!db) {
          sendJson(res, 503, {
            ok: false,
            valid: false,
            authenticated: false,
            error: 'Base de données indisponible pour vérifier votre session.',
          });
          return;
        }
        try {
          await ensureSchema(db.pool);
          const parentRes = await db.pool.query<{
            id: string;
            nom_complet: string;
            telephone: string;
            telephone_normalise: string;
            email: string | null;
            est_actif: boolean;
          }>(
            `SELECT id, nom_complet, telephone, telephone_normalise, email, est_actif
             FROM comptes_parents
             WHERE id = $1
             LIMIT 1`,
            [session.userId]
          );

          if (parentRes.rows.length === 0) {
            sendJson(res, 401, {
              ok: false,
              valid: false,
              authenticated: false,
              error: 'Compte parent introuvable ou supprimé.',
            });
            return;
          }

          const account = parentRes.rows[0];
          if (!account.est_actif) {
            sendJson(res, 403, {
              ok: false,
              valid: false,
              authenticated: false,
              error: 'Ce compte parent est temporairement désactivé.',
            });
            return;
          }

          sendJson(res, 200, {
            ok: true,
            valid: true,
            authenticated: true,
            type: 'PARENT',
            userId: account.id,
            parent: {
              id: account.id,
              nomComplet: account.nom_complet,
              telephone: account.telephone,
              telephoneNormalise: account.telephone_normalise,
              email: account.email || undefined,
            },
          });
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur validation session parent';
          sendJson(res, 500, { ok: false, valid: false, authenticated: false, error: msg });
          return;
        }
      }

      // STAFF validation
      if (db) {
        const numericId = Number(session.userId);
        if (Number.isInteger(numericId) && numericId > 0) {
          try {
            await ensureSchema(db.pool);
            const staffRes = await db.pool.query<{
              id: number;
              nom_complet: string;
              email: string;
              role_utilisateur: string;
              est_actif: boolean;
            }>(
              `SELECT id, nom_complet, email, role_utilisateur, est_actif
               FROM utilisateurs
               WHERE id = $1
               LIMIT 1`,
              [numericId]
            );
            if (staffRes.rows.length === 0 || !staffRes.rows[0].est_actif) {
              sendJson(res, 403, {
                ok: false,
                valid: false,
                authenticated: false,
                error: 'Compte agent désactivé ou introuvable.',
              });
              return;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur validation agent';
            sendJson(res, 500, { ok: false, valid: false, authenticated: false, error: msg });
            return;
          }
        }
      }

      sendJson(res, 200, {
        ok: true,
        valid: true,
        authenticated: true,
        type: 'STAFF',
        userId: session.userId,
        author: session.author || null,
        staffRole: session.staffRole || null,
        email: session.email || null,
      });
      return;
    }

    const session = verifySessionToken(req);
    sendJson(res, 200, {
      ok: true,
      authenticated: session.valid,
      type: session.type || null,
      userId: session.userId || null,
      author: session.author || null,
      staffRole: session.staffRole || null,
      phone: session.phone || null,
      email: session.email || null,
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  const body = await readJsonBody(req);
  const action = typeof body.action === 'string' ? body.action.trim() : 'staff_login';

  // -------------------------------------------------------------------------
  // 1. PARENT REGISTRATION
  // -------------------------------------------------------------------------
  if (action === 'parent_register') {
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const nomComplet = typeof body.nomComplet === 'string' ? body.nomComplet.trim() : '';
    const rawTel = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const telNorm = normalizePhone(rawTel);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (nomComplet.length < 2 || nomComplet.length > 120) {
      sendJson(res, 400, { ok: false, error: 'Veuillez renseigner votre nom complet.' });
      return;
    }
    if (telNorm.length < 8 || telNorm.length > 15) {
      sendJson(res, 400, { ok: false, error: 'Numéro de téléphone invalide (minimum 8 chiffres).' });
      return;
    }
    if (password.length < 4 || password.length > 64) {
      sendJson(res, 400, { ok: false, error: 'Le mot de passe / code secret doit contenir entre 4 et 64 caractères.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const existing = await db.pool.query<{ id: string }>(
        'SELECT id FROM comptes_parents WHERE telephone_normalise = $1 LIMIT 1',
        [telNorm]
      );
      if (existing.rows.length > 0) {
        sendJson(res, 409, {
          ok: false,
          error: 'Un espace parent existe déjà pour ce numéro de téléphone. Veuillez vous connecter.',
        });
        return;
      }

      const id = 'PAR_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      const passwordHash = hashSecret(password);

      await db.pool.query(
        `INSERT INTO comptes_parents (id, nom_complet, telephone, telephone_normalise, email, mot_de_passe_hash, date_derniere_connexion)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [id, nomComplet, rawTel, telNorm, email || null, passwordHash]
      );

      const token = createSessionToken({
        type: 'PARENT',
        userId: id,
        author: nomComplet,
        phone: telNorm,
        email: email || undefined,
      });

      sendJson(res, 200, {
        ok: true,
        token,
        expiresInSeconds: 43200,
        parent: {
          id,
          nomComplet,
          telephone: rawTel,
          telephoneNormalise: telNorm,
          email: email || undefined,
        },
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur création compte parent';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // 2. PARENT LOGIN
  // -------------------------------------------------------------------------
  if (action === 'parent_login') {
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const rawTel = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const telNorm = normalizePhone(rawTel);
    const password = typeof body.password === 'string' ? body.password : '';

    if (telNorm.length < 8 || !password) {
      sendJson(res, 400, { ok: false, error: 'Veuillez saisir votre téléphone et votre mot de passe.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const found = await db.pool.query<{
        id: string;
        nom_complet: string;
        telephone: string;
        telephone_normalise: string;
        email: string | null;
        mot_de_passe_hash: string;
        est_actif: boolean;
      }>(
        `SELECT id, nom_complet, telephone, telephone_normalise, email, mot_de_passe_hash, est_actif
         FROM comptes_parents
         WHERE telephone_normalise = $1
         LIMIT 1`,
        [telNorm]
      );

      if (found.rows.length === 0) {
        sendJson(res, 401, { ok: false, error: 'Aucun espace parent trouvé pour ce numéro de téléphone.' });
        return;
      }

      const account = found.rows[0];
      if (!account.est_actif) {
        sendJson(res, 403, { ok: false, error: 'Ce compte parent est temporairement désactivé.' });
        return;
      }

      if (!verifySecret(password, account.mot_de_passe_hash)) {
        sendJson(res, 401, { ok: false, error: 'Mot de passe incorrect.' });
        return;
      }

      await db.pool.query('UPDATE comptes_parents SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id = $1', [
        account.id,
      ]);

      const token = createSessionToken({
        type: 'PARENT',
        userId: account.id,
        author: account.nom_complet,
        phone: account.telephone_normalise,
        email: account.email || undefined,
      });

      sendJson(res, 200, {
        ok: true,
        token,
        expiresInSeconds: 43200,
        parent: {
          id: account.id,
          nomComplet: account.nom_complet,
          telephone: account.telephone,
          telephoneNormalise: account.telephone_normalise,
          email: account.email || undefined,
        },
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur connexion parent';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // 2B. PARENT PASSWORD RECOVERY (STAFF TEMP CODE OR RESEND EMAIL)
  // -------------------------------------------------------------------------
  if (action === 'staff_generate_parent_reset') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid) {
      sendJson(res, 401, { ok: false, error: 'Authentification administrative requise.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const rawTel = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const telNorm = normalizePhone(rawTel);
    const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : '';

    if (!parentId && telNorm.length < 8) {
      sendJson(res, 400, { ok: false, error: 'Numéro de téléphone du parent requis.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const found = await db.pool.query<{
        id: string;
        nom_complet: string;
        telephone: string;
        telephone_normalise: string;
        est_actif: boolean;
      }>(
        parentId
          ? `SELECT id, nom_complet, telephone, telephone_normalise, est_actif
             FROM comptes_parents WHERE id = $1 LIMIT 1`
          : `SELECT id, nom_complet, telephone, telephone_normalise, est_actif
             FROM comptes_parents WHERE telephone_normalise = $1 LIMIT 1`,
        [parentId || telNorm]
      );

      if (found.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Aucun compte parent trouvé pour ce numéro.' });
        return;
      }

      const parent = found.rows[0];
      if (!parent.est_actif) {
        sendJson(res, 403, { ok: false, error: 'Ce compte parent est désactivé.' });
        return;
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = hashSecret(code);
      const resetId = 'RST_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

      await db.pool.query(
        'UPDATE reinitialisations_mdp SET used_at = CURRENT_TIMESTAMP WHERE parent_id = $1 AND used_at IS NULL',
        [parent.id]
      );

      await db.pool.query(
        `INSERT INTO reinitialisations_mdp (id, parent_id, telephone_normalise, code_hash, generated_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '15 minutes')`,
        [resetId, parent.id, parent.telephone_normalise, codeHash, staffAuth.author || 'Secrétariat']
      );

      await db.pool.query(
        `INSERT INTO journal_activites (id, type_action, auteur, description, details, niveau_gravite)
         VALUES ($1, 'RESET_MDP_PARENT', $2, $3, $4, 'AVERTISSEMENT')`,
        [
          'LOG_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
          staffAuth.author || 'Secrétariat',
          `Génération d'un code temporaire de réinitialisation de mot de passe pour ${parent.nom_complet} (${parent.telephone})`,
          JSON.stringify({ parentId: parent.id }),
        ]
      );

      sendJson(res, 200, {
        ok: true,
        code,
        parentName: parent.nom_complet,
        telephone: parent.telephone,
        expiresInMinutes: 15,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur génération code temporaire';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (action === 'parent_request_reset') {
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const rawTel = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const telNorm = normalizePhone(rawTel);
    if (telNorm.length < 8) {
      sendJson(res, 400, { ok: false, error: 'Veuillez saisir un numéro de téléphone valide.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const resendKey = process.env.RESEND_API_KEY?.trim();

      if (resendKey) {
        const found = await db.pool.query<{
          id: string;
          nom_complet: string;
          telephone_normalise: string;
          email: string | null;
          est_actif: boolean;
        }>(
          `SELECT id, nom_complet, telephone_normalise, email, est_actif
           FROM comptes_parents
           WHERE telephone_normalise = $1
           LIMIT 1`,
          [telNorm]
        );

        const account = found.rows[0];
        if (account && account.est_actif && account.email && account.email.includes('@')) {
          const code = String(crypto.randomInt(100000, 1000000));
          const codeHash = hashSecret(code);
          const resetId = 'RST_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

          await db.pool.query(
            'UPDATE reinitialisations_mdp SET used_at = CURRENT_TIMESTAMP WHERE parent_id = $1 AND used_at IS NULL',
            [account.id]
          );
          await db.pool.query(
            `INSERT INTO reinitialisations_mdp (id, parent_id, telephone_normalise, code_hash, generated_by, expires_at)
             VALUES ($1, $2, $3, $4, 'EMAIL_AUTO', CURRENT_TIMESTAMP + INTERVAL '15 minutes')`,
            [resetId, account.id, account.telephone_normalise, codeHash]
          );

          const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'EduPay Scolarité <onboarding@resend.dev>';
          const mailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [account.email],
              subject: 'Code de réinitialisation - EduPay Scolarité',
              text: `Bonjour ${account.nom_complet},\n\nVotre code temporaire de réinitialisation est : ${code}\nCe code est valable 15 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
            }),
          });

          if (mailRes.ok) {
            sendJson(res, 200, {
              ok: true,
              deliveryMethod: 'EMAIL',
              message: "Un code temporaire à 6 chiffres vient d'être envoyé à l'adresse email associée à votre compte.",
            });
            return;
          }
        }
      }

      sendJson(res, 200, {
        ok: true,
        deliveryMethod: 'SECRETARIAT',
        message:
          "Demandez votre code temporaire à 6 chiffres (valable 15 min) auprès du Secrétariat de l'école, puis saisissez-le ci-dessous pour choisir votre nouveau mot de passe.",
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur demande de réinitialisation';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (action === 'parent_confirm_reset') {
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const rawTel = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const telNorm = normalizePhone(rawTel);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (telNorm.length < 8 || !/^\d{6}$/.test(code)) {
      sendJson(res, 400, { ok: false, error: 'Numéro de téléphone et code à 6 chiffres requis.' });
      return;
    }
    if (newPassword.length < 4 || newPassword.length > 64) {
      sendJson(res, 400, {
        ok: false,
        error: 'Le nouveau mot de passe doit contenir entre 4 et 64 caractères.',
      });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const found = await db.pool.query<{
        id: string;
        nom_complet: string;
        telephone: string;
        telephone_normalise: string;
        email: string | null;
        est_actif: boolean;
      }>(
        `SELECT id, nom_complet, telephone, telephone_normalise, email, est_actif
         FROM comptes_parents
         WHERE telephone_normalise = $1
         LIMIT 1`,
        [telNorm]
      );

      if (found.rows.length === 0 || !found.rows[0].est_actif) {
        sendJson(res, 400, { ok: false, error: 'Code invalide ou expiré.' });
        return;
      }

      const account = found.rows[0];
      const resetRes = await db.pool.query<{
        id: string;
        code_hash: string;
        attempts: number;
      }>(
        `SELECT id, code_hash, attempts
         FROM reinitialisations_mdp
         WHERE parent_id = $1
           AND used_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1`,
        [account.id]
      );

      if (resetRes.rows.length === 0) {
        sendJson(res, 400, {
          ok: false,
          error: 'Aucun code valide ou code expiré. Demandez un nouveau code au secrétariat.',
        });
        return;
      }

      const resetRow = resetRes.rows[0];
      if (resetRow.attempts >= 5) {
        await db.pool.query('UPDATE reinitialisations_mdp SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [
          resetRow.id,
        ]);
        sendJson(res, 429, {
          ok: false,
          error: 'Trop de tentatives incorrectes. Demandez un nouveau code au secrétariat.',
        });
        return;
      }

      if (!verifySecret(code, resetRow.code_hash)) {
        await db.pool.query('UPDATE reinitialisations_mdp SET attempts = attempts + 1 WHERE id = $1', [
          resetRow.id,
        ]);
        sendJson(res, 401, { ok: false, error: 'Code de réinitialisation incorrect.' });
        return;
      }

      const passwordHash = hashSecret(newPassword);
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE reinitialisations_mdp SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [
          resetRow.id,
        ]);
        await client.query(
          `UPDATE comptes_parents
           SET mot_de_passe_hash = $1, date_derniere_connexion = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [passwordHash, account.id]
        );
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }

      const token = createSessionToken({
        type: 'PARENT',
        userId: account.id,
        author: account.nom_complet,
        phone: account.telephone_normalise,
        email: account.email || undefined,
      });

      sendJson(res, 200, {
        ok: true,
        token,
        expiresInSeconds: 43200,
        parent: {
          id: account.id,
          nomComplet: account.nom_complet,
          telephone: account.telephone,
          telephoneNormalise: account.telephone_normalise,
          email: account.email || undefined,
        },
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur confirmation réinitialisation';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // 3. STAFF MANAGEMENT ACTIONS (AUTHENTICATED STAFF)
  // -------------------------------------------------------------------------
  if (action === 'create_staff') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid) {
      sendJson(res, 401, { ok: false, error: 'Authentification administrative requise.' });
      return;
    }
    if (staffAuth.staffRole !== 'DIRECTEUR') {
      sendJson(res, 403, { ok: false, error: 'Seule la Direction peut créer des comptes agents.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const nomComplet = typeof body.nomComplet === 'string' ? body.nomComplet.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const telephone = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    const rawRole = typeof body.role === 'string' ? body.role.trim().toUpperCase() : 'SECRETAIRE';
    const role: StaffRole = ALLOWED_STAFF_ROLES.includes(rawRole as StaffRole)
      ? (rawRole as StaffRole)
      : 'SECRETAIRE';

    if (nomComplet.length < 2 || !email.includes('@') || pin.length < 4 || pin.length > 32) {
      sendJson(res, 400, { ok: false, error: 'Nom complet, email valide et PIN (min 4 caractères) requis.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const allUsers = await db.pool.query<{ id: number; email: string; code_pin: string; pin_hash: string | null }>(
        'SELECT id, email, code_pin, pin_hash FROM utilisateurs'
      );

      if (allUsers.rows.some((u) => u.email.toLowerCase() === email)) {
        sendJson(res, 409, { ok: false, error: 'Un compte agent existe déjà avec cette adresse email.' });
        return;
      }

      const duplicatePin = allUsers.rows.some((u) =>
        u.pin_hash ? verifySecret(pin, u.pin_hash) : Boolean(u.code_pin && verifySecret(pin, u.code_pin))
      );
      if (duplicatePin) {
        sendJson(res, 409, { ok: false, error: 'Ce code PIN est déjà utilisé par un autre agent. Choisissez un PIN unique.' });
        return;
      }

      const pinHash = hashSecret(pin);
      const inserted = await db.pool.query<{ id: number }>(
        `INSERT INTO utilisateurs (nom_complet, email, code_pin, pin_hash, role_utilisateur, telephone, est_actif)
         VALUES ($1, $2, '', $3, $4, $5, TRUE)
         RETURNING id`,
        [nomComplet, email, pinHash, role, telephone || null]
      );

      await db.pool.query(
        `INSERT INTO journal_activites (id, type_action, auteur, description, details, niveau_gravite)
         VALUES ($1, 'CREATION_AGENT', $2, $3, $4, 'INFO')`,
        [
          'LOG_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
          staffAuth.author || 'Direction',
          `Création du compte ${role} pour ${nomComplet} (${email})`,
          JSON.stringify({ email, role }),
        ]
      );

      sendJson(res, 200, {
        ok: true,
        staffId: inserted.rows[0]?.id,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur création compte agent';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (action === 'toggle_staff') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid || staffAuth.staffRole !== 'DIRECTEUR') {
      sendJson(res, 403, { ok: false, error: 'Seule la Direction peut modifier les accès.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const staffId = Number(body.staffId);
    const estActif = Boolean(body.estActif);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      sendJson(res, 400, { ok: false, error: 'Identifiant agent invalide.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      if (String(staffId) === String(staffAuth.userId) && !estActif) {
        sendJson(res, 400, { ok: false, error: 'Vous ne pouvez pas désactiver votre propre compte connecté.' });
        return;
      }

      await db.pool.query('UPDATE utilisateurs SET est_actif = $1 WHERE id = $2', [estActif, staffId]);
      sendJson(res, 200, { ok: true });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur modification statut agent';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (action === 'update_own_pin') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid) {
      sendJson(res, 401, { ok: false, error: 'Authentification requise.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }
    const newPin = typeof body.newPin === 'string' ? body.newPin.trim() : '';
    const currentPin = typeof body.currentPin === 'string' ? body.currentPin.trim() : '';
    if (newPin.length < 4 || newPin.length > 32) {
      sendJson(res, 400, { ok: false, error: 'Le nouveau PIN doit contenir entre 4 et 32 caractères.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const userIdNum = Number(staffAuth.userId);
      if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
        sendJson(res, 400, { ok: false, error: 'Modification non disponible pour ce profil système.' });
        return;
      }
      const userRes = await db.pool.query<{ id: number; code_pin: string; pin_hash: string | null }>(
        'SELECT id, code_pin, pin_hash FROM utilisateurs WHERE id = $1 LIMIT 1',
        [userIdNum]
      );
      if (userRes.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Compte introuvable.' });
        return;
      }
      const u = userRes.rows[0];
      const matches = u.pin_hash ? verifySecret(currentPin, u.pin_hash) : verifySecret(currentPin, u.code_pin);
      if (!matches) {
        sendJson(res, 401, { ok: false, error: 'Code PIN actuel incorrect.' });
        return;
      }

      const newHash = hashSecret(newPin);
      await db.pool.query("UPDATE utilisateurs SET pin_hash = $1, code_pin = '' WHERE id = $2", [newHash, u.id]);
      sendJson(res, 200, { ok: true });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur changement PIN';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (action === 'reset_staff_pin') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid || staffAuth.staffRole !== 'DIRECTEUR') {
      sendJson(res, 403, { ok: false, error: 'Seule la Direction peut réinitialiser le code PIN d’un agent.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    const staffId = Number(body.staffId);
    const newPin = typeof body.newPin === 'string' ? body.newPin.trim() : '';
    if (!Number.isInteger(staffId) || staffId <= 0) {
      sendJson(res, 400, { ok: false, error: 'Identifiant agent invalide.' });
      return;
    }
    if (newPin.length < 4 || newPin.length > 32) {
      sendJson(res, 400, { ok: false, error: 'Le nouveau code PIN doit contenir entre 4 et 32 caractères.' });
      return;
    }

    try {
      await ensureSchema(db.pool);
      const targetRes = await db.pool.query<{ id: number; nom_complet: string; email: string }>(
        'SELECT id, nom_complet, email FROM utilisateurs WHERE id = $1 LIMIT 1',
        [staffId]
      );
      if (targetRes.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Compte agent introuvable.' });
        return;
      }

      const otherUsers = await db.pool.query<{ id: number; code_pin: string; pin_hash: string | null }>(
        'SELECT id, code_pin, pin_hash FROM utilisateurs WHERE id <> $1',
        [staffId]
      );
      const duplicatePin = otherUsers.rows.some((u) =>
        u.pin_hash ? verifySecret(newPin, u.pin_hash) : Boolean(u.code_pin && verifySecret(newPin, u.code_pin))
      );
      if (duplicatePin) {
        sendJson(res, 409, { ok: false, error: 'Ce code PIN est déjà attribué à un autre agent.' });
        return;
      }

      const newHash = hashSecret(newPin);
      await db.pool.query("UPDATE utilisateurs SET pin_hash = $1, code_pin = '' WHERE id = $2", [
        newHash,
        staffId,
      ]);

      const target = targetRes.rows[0];
      await db.pool.query(
        `INSERT INTO journal_activites (id, type_action, auteur, description, details, niveau_gravite)
         VALUES ($1, 'CREATION_AGENT', $2, $3, $4, 'AVERTISSEMENT')`,
        [
          'LOG_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
          staffAuth.author || 'Direction',
          `Réinitialisation du code PIN de ${target.nom_complet} (${target.email})`,
          JSON.stringify({ staffId: target.id }),
        ]
      );

      sendJson(res, 200, { ok: true });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réinitialisation PIN agent';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  // -------------------------------------------------------------------------
  // 4. STAFF LOGIN (DEFAULT)
  // -------------------------------------------------------------------------
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!pin || pin.length > 64) {
    sendJson(res, 400, { ok: false, error: 'Veuillez saisir un code PIN valide.' });
    return;
  }

  const envPin = process.env.ADMIN_PIN?.trim();
  if (envPin && !email) {
    if (verifyPinConstantTime(pin, envPin)) {
      const token = createSecretaryToken('Direction Principale', 'DIRECTEUR', 'env-admin');
      sendJson(res, 200, {
        ok: true,
        token,
        author: 'Direction Principale',
        staffRole: 'DIRECTEUR',
        expiresInSeconds: 43200,
      });
      return;
    }
    if (!db) {
      sendJson(res, 401, { ok: false, error: 'Code PIN secrétariat incorrect.' });
      return;
    }
  }

  if (db) {
    try {
      await ensureSchema(db.pool);
      const query = email
        ? `SELECT id, nom_complet, email, code_pin, pin_hash, role_utilisateur
           FROM utilisateurs
           WHERE est_actif = TRUE AND LOWER(email) = $1
           LIMIT 1`
        : `SELECT id, nom_complet, email, code_pin, pin_hash, role_utilisateur
           FROM utilisateurs
           WHERE est_actif = TRUE
           ORDER BY id ASC
           LIMIT 50`;

      const result = await db.pool.query<{
        id: number;
        nom_complet: string;
        email: string;
        code_pin: string;
        pin_hash: string | null;
        role_utilisateur: string;
      }>(query, email ? [email] : []);

      for (const user of result.rows) {
        const stored = user.pin_hash || user.code_pin;
        if (stored && verifySecret(pin, stored)) {
          const author = user.nom_complet || 'Secrétaire Principale';
          const role: StaffRole = ALLOWED_STAFF_ROLES.includes(user.role_utilisateur as StaffRole)
            ? (user.role_utilisateur as StaffRole)
            : 'SECRETAIRE';
          await db.pool.query(
            'UPDATE utilisateurs SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
          );
          const token = createSecretaryToken(author, role, String(user.id), user.email);
          sendJson(res, 200, {
            ok: true,
            token,
            author,
            staffRole: role,
            email: user.email,
            expiresInSeconds: 43200,
          });
          return;
        }
      }

      sendJson(res, 401, { ok: false, error: 'Identifiant ou code PIN incorrect.' });
      return;
    } catch (err) {
      console.warn('[API Auth] Erreur lecture DB, repli vérification standard:', err);
    }
  }

  // Fallback before Postgres configuration
  if (verifyPinConstantTime(pin, '1234')) {
    const token = createSecretaryToken('Direction & Secrétariat Principal', 'DIRECTEUR', 'local-admin');
    sendJson(res, 200, {
      ok: true,
      token,
      author: 'Direction & Secrétariat Principal',
      staffRole: 'DIRECTEUR',
      expiresInSeconds: 43200,
    });
    return;
  }

  sendJson(res, 401, { ok: false, error: 'Code PIN incorrect.' });
}
