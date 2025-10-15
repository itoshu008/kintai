// backend/src/server.ts
import 'dotenv/config';
import express from 'express';
import admin from './routes/admin/index.js'; // ★ .js 拡張子（ESM）

// Express アプリケーションを直接作成
const app = express();

// --- middlewares ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// --- ヘルスチェックエンドポイント ---
app.get('/api/admin/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

// --- API mount point ---
app.use('/api/admin', admin);

// --- ルートレベルのAPI（Nginxプロキシ用） ---
app.use('/api', admin);

// --- 404 / error handlers (JSON) ---
app.use((req, res, _next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok:false, error:'Not Found', path:req.originalUrl });
  }
  return _next(); // 静的配信はNginx/フロントへ
});
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[API ERROR]', err);
  res.status(err?.status || 500).json({ ok:false, error:String(err?.message||err) });
});

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';

process.on('uncaughtException', e => { console.error('[FATAL uncaught]', e); process.exit(1); });
process.on('unhandledRejection', e => { console.error('[FATAL unhandled]', e); process.exit(1); });

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  if (typeof process.send === 'function') process.send('ready'); // ★起動完了シグナル
});