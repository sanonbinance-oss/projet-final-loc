import {
  type ApiRequest,
  type ApiResponse,
  createSecretaryToken,
  ensureSchema,
  getPool,
  readJsonBody,
  sendJson,
  verifyPinConstantTime,
  verifySecretaryToken,
} from './_serverCore.ts';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method === 'GET') {
    const auth = verifySecretaryToken(req);
    sendJson(res, 200, {
      ok: true,
      authenticated: auth.valid,
      author: auth.author || null,
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  const body = await readJsonBody(req);
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  if (!pin || pin.length > 64) {
    sendJson(res, 400, { ok: false, error: 'Veuillez saisir un code PIN valide.' });
    return;
  }

  const envPin = process.env.ADMIN_PIN?.trim();
  if (envPin) {
    if (verifyPinConstantTime(pin, envPin)) {
      const token = createSecretaryToken('Secrétaire Principale');
      sendJson(res, 200, { ok: true, token, author: 'Secrétaire Principale', expiresInSeconds: 43200 });
      return;
    }
    sendJson(res, 401, { ok: false, error: 'Code PIN secrétariat incorrect.' });
    return;
  }

  const db = getPool();
  if (db) {
    try {
      await ensureSchema(db.pool);
      const result = await db.pool.query<{ nom_complet: string; code_pin: string }>(
        'SELECT nom_complet, code_pin FROM utilisateurs WHERE est_actif = TRUE LIMIT 20'
      );

      for (const user of result.rows) {
        if (user.code_pin && verifyPinConstantTime(pin, user.code_pin)) {
          const author = user.nom_complet || 'Secrétaire Principale';
          const token = createSecretaryToken(author);
          sendJson(res, 200, { ok: true, token, author, expiresInSeconds: 43200 });
          return;
        }
      }

      // Compatibilité avec le code démo initial si aucun PIN personnalisé n'est défini
      if (
        result.rows.some((u) => u.code_pin === '1234') &&
        (verifyPinConstantTime(pin, 'admin') || verifyPinConstantTime(pin, 'secretaire'))
      ) {
        const token = createSecretaryToken('Secrétaire Principale');
        sendJson(res, 200, { ok: true, token, author: 'Secrétaire Principale', expiresInSeconds: 43200 });
        return;
      }

      sendJson(res, 401, { ok: false, error: "Code PIN incorrect. Le code par défaut est : 1234" });
      return;
    } catch (err) {
      console.warn('[API Auth] Erreur lecture DB, repli vérification standard:', err);
    }
  }

  // Repli local (avant connexion d'une base Postgres)
  if (
    verifyPinConstantTime(pin, '1234') ||
    verifyPinConstantTime(pin, 'admin') ||
    verifyPinConstantTime(pin, 'secretaire')
  ) {
    const token = createSecretaryToken('Secrétaire Principale');
    sendJson(res, 200, { ok: true, token, author: 'Secrétaire Principale', expiresInSeconds: 43200 });
    return;
  }

  sendJson(res, 401, { ok: false, error: "Code PIN incorrect. Le code par défaut est : 1234" });
}
