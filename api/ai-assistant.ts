import crypto from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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

const GEMINI_PRIMARY_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const ALLOWED_CATEGORIES = new Set(['TARIF', 'PROGRAMME', 'PROCEDURE', 'URGENT', 'INFO']);

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

const SITE_USAGE_MANUAL = `
GUIDE COMPLET D'UTILISATION DU SITE EDUPAY SCOLARITÉ (GROUPE SCOLAIRE EXCELLENCE & AVENIR - OUAGADOUGOU) :

1. CRÉER OU ACCÉDER À SON ESPACE PARENT PRIVÉ :
- Pour protéger la vie privée de chaque famille, chaque parent crée son propre espace privé sécurisé avec son Nom complet, son Numéro de téléphone et un Mot de passe personnel.
- S'il a déjà un compte, il clique sur "Se connecter".
- En cas d'oubli du mot de passe : cliquer sur "Mot de passe oublié ?", saisir son numéro de téléphone et entrer le code temporaire à 6 chiffres fourni par le Secrétariat (ou reçu par email si activé) pour définir immédiatement un nouveau mot de passe.
- Chaque parent ne voit QUE ses propres enfants, ses propres demandes d'admission, ses propres messages et ses propres reçus.

2. ONGLETS DU PORTAIL PARENTS :
- "Payer une Scolarité" : Sélectionner l'enfant (ou le rattacher via son matricule dans "+ Rattacher un élève"), choisir l'opérateur (Orange Money *144*4*6#, Moov Africa *555#, MTN MoMo *133#, LigdiCash), saisir le montant (ou choisir un montant rapide / "Payer tout le solde"), éventuellement ajouter un don pour les œuvres scolaires, entrer le numéro payeur et valider via le code OTP de confirmation. Dès que la secrétaire vérifie l'encaissement, le reçu officiel est débloqué.
- "Demande d'Admission" : Remplir l'identité de l'enfant, choisir la classe souhaitée (de Maternelle à Terminale et filières techniques BEP / Bac Pro / C' / D'), préciser l'établissement d'origine, la décision du bulletin du 3ème trimestre et la moyenne annuelle, puis joindre le Bulletin du 3ème trimestre (Photo ou PDF) et l'Extrait d'acte de naissance (Photo ou PDF), et enfin les coordonnées du parent.
- "Messages" : Permet de suivre en temps réel la décision du Secrétariat sur chaque demande d'admission ou paiement. Si la demande est acceptée, un bouton direct "Payer maintenant" s'affiche pour passer au règlement de la scolarité avec le matricule attribué. Si elle est refusée, le motif exact du secrétariat y est affiché.
- "Mes Reçus" : Regroupe l'ensemble des quittances officielles validées (imprimables en PDF/papier) avec signature numérique anti-fraude et QR code.
- "Grille Tarifaire" : Affiche les frais officiels par niveau (scolarité nette, frais d'inscription, frais annexes et total annuel exigible) et l'échéancier des 3 tranches (1ère tranche à l'inscription, 2ème tranche avant le 15 Janvier 2028, 3ème tranche avant le 15 Mars 2028).
- "Vérifier un Reçu" : Permet à toute personne ou contrôleur de vérifier l'authenticité d'une quittance grâce à sa référence (ex: QTT-...) et sa signature anti-fraude.
- "Contact" : Affiche l'adresse de l'établissement, les téléphones directs, l'email et les horaires d'ouverture de la caisse (Lundi-Vendredi 07h30-12h30 et 15h00-17h30, Samedi 08h00-12h00).
`;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const db = getPool();

  if (req.method === 'GET') {
    const action = readQueryParam(req, 'action') || 'announcements';

    if (!db) {
      sendJson(res, 200, { ok: true, instructions: [] });
      return;
    }

    try {
      await ensureSchema(db.pool);

      if (action === 'instructions') {
        const staffAuth = verifySecretaryToken(req);
        if (!staffAuth.valid) {
          sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
          return;
        }
        const rows = await db.pool.query<{
          id: string;
          categorie: string;
          titre: string;
          contenu: string;
          auteur: string;
          est_actif: boolean;
          date_creation: string;
          date_modification: string;
        }>(
          `SELECT id, categorie, titre, contenu, auteur, est_actif, date_creation, date_modification
           FROM instructions_ia
           ORDER BY date_modification DESC
           LIMIT 100`
        );
        sendJson(res, 200, {
          ok: true,
          instructions: rows.rows.map((r) => ({
            id: r.id,
            categorie: r.categorie,
            titre: r.titre,
            contenu: r.contenu,
            auteur: r.auteur,
            estActif: r.est_actif,
            dateCreation: r.date_creation,
            dateModification: r.date_modification,
          })),
        });
        return;
      }

      // Public/Parent active announcements summary
      const rows = await db.pool.query<{
        id: string;
        categorie: string;
        titre: string;
        contenu: string;
        auteur: string;
        est_actif: boolean;
        date_creation: string;
        date_modification: string;
      }>(
        `SELECT id, categorie, titre, contenu, auteur, est_actif, date_creation, date_modification
         FROM instructions_ia
         WHERE est_actif = TRUE
         ORDER BY date_modification DESC
         LIMIT 20`
      );
      sendJson(res, 200, {
        ok: true,
        instructions: rows.rows.map((r) => ({
          id: r.id,
          categorie: r.categorie,
          titre: r.titre,
          contenu: r.contenu,
          auteur: r.auteur,
          estActif: r.est_actif,
          dateCreation: r.date_creation,
          dateModification: r.date_modification,
        })),
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lecture instructions IA';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  const body = await readJsonBody(req);
  const action = typeof body.action === 'string' ? body.action.trim() : 'ask';

  // ---------------------------------------------------------------------------
  // STAFF CRUD ON LIVE SECRETARY INSTRUCTIONS FOR THE AI
  // ---------------------------------------------------------------------------
  if (action === 'save_instruction' || action === 'toggle_instruction' || action === 'delete_instruction') {
    const staffAuth = verifySecretaryToken(req);
    if (!staffAuth.valid) {
      sendJson(res, 401, { ok: false, error: 'Authentification secrétariat requise.' });
      return;
    }
    if (!db) {
      sendJson(res, 503, { ok: false, error: 'Base de données non disponible.' });
      return;
    }

    try {
      await ensureSchema(db.pool);

      if (action === 'save_instruction') {
        const rawCat = typeof body.categorie === 'string' ? body.categorie.trim().toUpperCase() : 'INFO';
        const categorie = ALLOWED_CATEGORIES.has(rawCat) ? rawCat : 'INFO';
        const titre = typeof body.titre === 'string' ? body.titre.trim().slice(0, 180) : '';
        const contenu = typeof body.contenu === 'string' ? body.contenu.trim().slice(0, 4000) : '';
        const estActif = body.estActif !== false;
        const providedId = typeof body.id === 'string' && body.id.trim() ? body.id.trim().slice(0, 64) : '';

        if (titre.length < 2 || contenu.length < 3) {
          sendJson(res, 400, { ok: false, error: 'Titre et contenu détaillé requis (minimum 3 caractères).' });
          return;
        }

        const id = providedId || 'IA_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
        const auteur = staffAuth.author || 'Secrétariat';

        const saved = await db.pool.query<{
          id: string;
          categorie: string;
          titre: string;
          contenu: string;
          auteur: string;
          est_actif: boolean;
          date_creation: string;
          date_modification: string;
        }>(
          `INSERT INTO instructions_ia (id, categorie, titre, contenu, auteur, est_actif, date_creation, date_modification)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (id)
           DO UPDATE SET
             categorie = EXCLUDED.categorie,
             titre = EXCLUDED.titre,
             contenu = EXCLUDED.contenu,
             auteur = EXCLUDED.auteur,
             est_actif = EXCLUDED.est_actif,
             date_modification = CURRENT_TIMESTAMP
           RETURNING id, categorie, titre, contenu, auteur, est_actif, date_creation, date_modification`,
          [id, categorie, titre, contenu, auteur, estActif]
        );

        const row = saved.rows[0];
        sendJson(res, 200, {
          ok: true,
          instruction: {
            id: row.id,
            categorie: row.categorie,
            titre: row.titre,
            contenu: row.contenu,
            auteur: row.auteur,
            estActif: row.est_actif,
            dateCreation: row.date_creation,
            dateModification: row.date_modification,
          },
        });
        return;
      }

      if (action === 'toggle_instruction') {
        const id = typeof body.id === 'string' ? body.id.trim() : '';
        const estActif = Boolean(body.estActif);
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Identifiant requis.' });
          return;
        }
        await db.pool.query(
          'UPDATE instructions_ia SET est_actif = $1, date_modification = CURRENT_TIMESTAMP WHERE id = $2',
          [estActif, id]
        );
        sendJson(res, 200, { ok: true });
        return;
      }

      if (action === 'delete_instruction') {
        const id = typeof body.id === 'string' ? body.id.trim() : '';
        if (!id) {
          sendJson(res, 400, { ok: false, error: 'Identifiant requis.' });
          return;
        }
        await db.pool.query('DELETE FROM instructions_ia WHERE id = $1', [id]);
        sendJson(res, 200, { ok: true });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur mise à jour instruction IA';
      sendJson(res, 500, { ok: false, error: msg });
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // PARENT AI QUESTION ANSWERING (GEMINI LIVE SYNC WITH DB)
  // ---------------------------------------------------------------------------
  if (action === 'ask') {
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 1200) {
      sendJson(res, 400, {
        ok: false,
        error: 'Veuillez poser une question claire (entre 1 et 1200 caractères).',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      sendJson(res, 503, {
        ok: false,
        error: "L'assistant IA n'est pas encore configuré (variable GEMINI_API_KEY manquante sur le serveur).",
      });
      return;
    }

    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: ChatTurn[] = [];
    for (const item of rawHistory.slice(-8)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as { role?: unknown; text?: unknown };
      const role = obj.role === 'model' ? 'model' : obj.role === 'user' ? 'user' : null;
      const text = typeof obj.text === 'string' ? obj.text.trim().slice(0, 1200) : '';
      if (role && text) {
        history.push({ role, text });
      }
    }

    let liveInstructionsText = "Aucune note spéciale active publiée pour l'instant par le secrétariat.";
    let activeCount = 0;
    let liveTariffsText = 'Grille standard active dans l’onglet Grille Tarifaire.';

    if (db) {
      try {
        await ensureSchema(db.pool);
        const [instRes, tarifRes] = await Promise.all([
          db.pool.query<{
            categorie: string;
            titre: string;
            contenu: string;
            auteur: string;
            date_modification: string;
          }>(
            `SELECT categorie, titre, contenu, auteur, date_modification
             FROM instructions_ia
             WHERE est_actif = TRUE
             ORDER BY date_modification DESC
             LIMIT 30`
          ),
          db.pool.query<{
            niveau: string;
            montant_scolarite: string | number;
            frais_inscription: string | number;
            frais_annexes: string | number;
            total_exigible: string | number;
          }>(
            `SELECT niveau, montant_scolarite, frais_inscription, frais_annexes, total_exigible
             FROM tarifs_scolarite
             WHERE annee_scolaire = '2027-2028'
             ORDER BY id ASC`
          ),
        ]);

        activeCount = instRes.rows.length;
        if (instRes.rows.length > 0) {
          liveInstructionsText = instRes.rows
            .map((r, i) => {
              const dateStr = new Date(r.date_modification).toLocaleDateString('fr-FR');
              return `${i + 1}. [${r.categorie}] ${r.titre} (mis à jour le ${dateStr} par ${r.auteur}) :\n${r.contenu}`;
            })
            .join('\n\n');
        }

        if (tarifRes.rows.length > 0) {
          liveTariffsText = tarifRes.rows
            .map(
              (t) =>
                `- ${t.niveau} : Scolarité ${Number(t.montant_scolarite).toLocaleString('fr-FR')} F + Inscription ${Number(t.frais_inscription).toLocaleString('fr-FR')} F + Annexes ${Number(t.frais_annexes).toLocaleString('fr-FR')} F = Total ${Number(t.total_exigible).toLocaleString('fr-FR')} FCFA`
            )
            .join('\n');
        }
      } catch (err) {
        console.warn('[API AI] Erreur lecture contexte PostgreSQL:', err);
      }
    }

    const systemInstruction = `Tu es l'assistant virtuel officiel du portail EduPay Scolarité pour le Groupe Scolaire Excellence & Avenir (Ouagadougou, Burkina Faso).
Tu aides les parents d'élèves avec bienveillance, clarté et précision en français.

RÈGLES DE RÉPONSE :
- Sois concis, chaleureux, structuré (listes courtes ou étapes numérotées quand c'est utile).
- Appuie-toi EN PRIORITÉ sur les "INSTRUCTIONS ET NOUVEAUTÉS EN TEMPS RÉEL DU SECRÉTARIAT" et sur les "TARIFS OFFICIELS ACTUELS" ci-dessous : si le secrétariat vient d'annoncer un nouveau tarif, un nouveau programme, une date limite ou une nouvelle règle, applique cette mise à jour immédiatement dans ta réponse.
- N'invente jamais de numéro de compte privé, de code secret ni de règle qui contredirait les données ci-dessous.
- Si une question concerne un dossier individuel précis (ex: montant exact restant dû d'un élève ou décision confidentielle), oriente poliment le parent vers l'onglet "Messages" ou "Payer une Scolarité" de son Espace Parent privé, ou vers le Secrétariat (+226 25 36 78 90 / +226 70 00 11 22).

${SITE_USAGE_MANUAL}

TARIFS OFFICIELS ACTUELS EN BASE DE DONNÉES (2027-2028) :
${liveTariffsText}

INSTRUCTIONS ET NOUVEAUTÉS EN TEMPS RÉEL DU SECRÉTARIAT (${activeCount} active(s)) :
${liveInstructionsText}`;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const contents = [
        ...history.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
        {
          role: 'user' as const,
          parts: [{ text: question }],
        },
      ];

      const modelsToTry = [GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODEL];
      let answer = '';
      let lastErr: unknown = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            });
            answer = (response.text || '').trim();
            if (answer) break;
          } catch (err) {
            lastErr = err;
            const errStr = err instanceof Error ? err.message : String(err);
            const isTransient = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('429');
            if (!isTransient) {
              throw err;
            }
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 450));
            }
          }
        }
        if (answer) break;
      }

      if (!answer) {
        if (lastErr) throw lastErr;
        sendJson(res, 502, {
          ok: false,
          error: "L'assistant n'a pas pu formuler de réponse. Veuillez réessayer.",
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        answer,
        activeInstructionsCount: activeCount,
      });
      return;
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Erreur lors de la consultation Gemini';
      console.warn('[API AI Gemini Error]', rawMsg);
      const isBusy = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('429');
      const friendlyError = isBusy
        ? "Le service d'assistance IA est momentanément très sollicité. Merci de réessayer dans quelques secondes."
        : rawMsg.includes('API_KEY') || rawMsg.includes('403')
        ? "La clé d'accès de l'assistant IA n'est pas valide ou requiert une vérification dans la configuration serveur."
        : "Le service d'assistance IA est momentanément indisponible. Veuillez réessayer ou contacter le secrétariat.";
      sendJson(res, 502, {
        ok: false,
        error: friendlyError,
      });
      return;
    }
  }

  sendJson(res, 400, { ok: false, error: 'Action AI inconnue.' });
}
