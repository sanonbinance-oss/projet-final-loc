import crypto from 'node:crypto';
import {
  type ApiRequest,
  type ApiResponse,
  ensureSchema,
  getPool,
  readJsonBody,
  readQueryParam,
  sendJson,
  verifySessionToken,
} from './_serverCore.ts';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_DOC_BYTES = 3.5 * 1024 * 1024; // 3.5 Mo

function normalizeMime(raw: string): string {
  const lower = String(raw || '').trim().toLowerCase();
  if (lower === 'image/jpg') return 'image/jpeg';
  return lower;
}

function sanitizeFileName(raw: string, fallbackExt: string): string {
  const base = String(raw || '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 160);
  if (base) return base;
  return `document.${fallbackExt}`;
}

function sanitizeDispositionName(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\;\r\n]/g, '_');
  return ascii || 'document';
}

function matchesExpectedMagic(mime: string, buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (mime === 'application/pdf') {
    return buf.subarray(0, 4).toString('ascii') === '%PDF';
  }
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8;
  }
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/webp') {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const db = getPool();
  if (!db) {
    sendJson(res, 503, { ok: false, error: 'Base de données non configurée.' });
    return;
  }

  const session = verifySessionToken(req);
  if (!session.valid || !session.userId) {
    sendJson(res, 401, { ok: false, error: 'Authentification requise pour accéder aux pièces justificatives.' });
    return;
  }

  try {
    await ensureSchema(db.pool);

    if (req.method === 'GET') {
      const id = readQueryParam(req, 'id').trim();
      if (!id || id.length > 64) {
        sendJson(res, 400, { ok: false, error: 'Identifiant de document invalide.' });
        return;
      }

      const found = await db.pool.query<{
        id: string;
        owner_parent_id: string | null;
        file_name: string;
        mime_type: string;
        size_bytes: number;
        content_data: Buffer;
      }>(
        `SELECT id, owner_parent_id, file_name, mime_type, size_bytes, content_data
         FROM fichiers_documents
         WHERE id = $1
         LIMIT 1`,
        [id]
      );

      if (found.rows.length === 0) {
        sendJson(res, 404, { ok: false, error: 'Document introuvable.' });
        return;
      }

      const doc = found.rows[0];
      if (session.type !== 'STAFF' && doc.owner_parent_id !== session.userId) {
        sendJson(res, 403, { ok: false, error: 'Accès refusé à ce document.' });
        return;
      }

      const safeMime = ALLOWED_MIME_TYPES.has(doc.mime_type) ? normalizeMime(doc.mime_type) : 'application/octet-stream';
      const download = readQueryParam(req, 'download') === '1';
      const dispositionType = download ? 'attachment' : 'inline';
      const safeName = sanitizeDispositionName(doc.file_name);

      res.statusCode = 200;
      res.setHeader('Content-Type', safeMime);
      res.setHeader('Content-Length', String(doc.content_data.length));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeName}"`);
      res.end(doc.content_data);
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const action = typeof body.action === 'string' ? body.action.trim() : 'upload';

      if (action === 'upload') {
        const rawMime = normalizeMime(typeof body.mimeType === 'string' ? body.mimeType : '');
        if (!ALLOWED_MIME_TYPES.has(rawMime)) {
          sendJson(res, 400, {
            ok: false,
            error: 'Format non supporté. Formats autorisés : PDF, JPEG, PNG ou WEBP.',
          });
          return;
        }

        const rawData = typeof body.base64Data === 'string' ? body.base64Data.trim() : '';
        if (!rawData) {
          sendJson(res, 400, { ok: false, error: 'Contenu du fichier manquant.' });
          return;
        }

        const base64Clean = rawData.includes(',') ? rawData.slice(rawData.indexOf(',') + 1) : rawData;
        const buffer = Buffer.from(base64Clean, 'base64');

        if (buffer.length === 0 || buffer.length > MAX_DOC_BYTES) {
          sendJson(res, 400, {
            ok: false,
            error: 'Fichier vide ou trop volumineux (taille maximale : 3,5 Mo).',
          });
          return;
        }

        if (!matchesExpectedMagic(rawMime, buffer)) {
          sendJson(res, 400, {
            ok: false,
            error: 'Le contenu du fichier ne correspond pas au format déclaré.',
          });
          return;
        }

        const ext = rawMime === 'application/pdf' ? 'pdf' : rawMime.split('/')[1] || 'bin';
        const fileName = sanitizeFileName(
          typeof body.fileName === 'string' ? body.fileName : '',
          ext
        );
        const docType = body.docType === 'extrait' ? 'extrait' : 'bulletin';
        const demandeId =
          typeof body.demandeId === 'string' && body.demandeId.trim()
            ? body.demandeId.trim().slice(0, 50)
            : null;
        const ownerParentId =
          session.type === 'PARENT'
            ? session.userId
            : typeof body.ownerParentId === 'string' && body.ownerParentId.trim()
            ? body.ownerParentId.trim().slice(0, 50)
            : null;

        const id = 'DOC_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

        await db.pool.query(
          `INSERT INTO fichiers_documents (id, owner_parent_id, demande_id, doc_type, file_name, mime_type, size_bytes, content_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, ownerParentId, demandeId, docType, fileName, rawMime, buffer.length, buffer]
        );

        sendJson(res, 200, {
          ok: true,
          id,
          url: `/api/documents?id=${encodeURIComponent(id)}`,
          fileName,
          mimeType: rawMime,
          sizeBytes: buffer.length,
        });
        return;
      }

      sendJson(res, 400, { ok: false, error: 'Action document inconnue.' });
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Méthode non autorisée.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur stockage document';
    console.warn('[API Documents]', msg);
    sendJson(res, 500, { ok: false, error: msg });
  }
}
