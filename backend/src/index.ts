// backend/src/index.ts
import express from 'express';

export function createApp() {
  const app = express();

  // ここにミドルウェアやルートを追加
  app.get('/api/admin/health', (_req, res) =>
    res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() })
  );

  return app;
}

export const app = createApp();
export default app;