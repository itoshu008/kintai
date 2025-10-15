// backend/src/server.ts
import 'dotenv/config';
import express from 'express';
import admin from './routes/admin/index.js';

const app = express();

// middlewares
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// health
app.get('/api/admin/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

// API routes
app.use('/api/admin', admin);

// API 404 / error handlers (JSON only for /api/*)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
  }
  return next();
});
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[API ERROR]', err);
  res.status(err?.status || 500).json({ ok: false, error: String(err?.message ?? err) });
});

// listen（pm2 wait_ready とペア）
const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  if (typeof process.send === 'function') process.send('ready');
});