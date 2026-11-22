import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import authHandler from './api/auth.ts';
import dbHandler from './api/db.ts';
import documentsHandler from './api/documents.ts';
import aiAssistantHandler from './api/ai-assistant.ts';
import type { ApiRequest, ApiResponse } from './api/_serverCore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '6mb' }));

  app.all('/api/auth', async (req, res) => {
    await authHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  app.all('/api/db', async (req, res) => {
    await dbHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  app.all('/api/documents', async (req, res) => {
    await documentsHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  app.all('/api/ai-assistant', async (req, res) => {
    await aiAssistantHandler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PayKal EduPay server running on http://0.0.0.0:${port}`);
  });
}

void startServer();
