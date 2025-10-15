// backend/src/server.ts
import 'dotenv/config';
import express from 'express';
import admin from './routes/admin/index.js'; // ★ .js 拡張子（ESM）

// Express アプリケーションを直接作成
const app = express();

// --- ミドルウェア設定 ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// --- API ログ（一時観測用） ---
app.use((req, _res, next) => { 
  if (req.path.startsWith('/api/')) console.log('[API HIT]', req.method, req.originalUrl); 
  next(); 
});

// --- ヘルスチェックエンドポイント（最優先） ---
app.get('/api/admin/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

// --- API ルートマウント（統一） ---
app.use('/api/admin', admin);

// --- API用404ハンドラー（APIルートの後） ---
app.use('/api/*', (req, res) => {
  console.log('[API 404]', req.method, req.originalUrl);
  res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
});

// --- グローバルエラーハンドラー ---
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[API ERROR]', err);
  res.status(err?.status || 500).json({ ok: false, error: String(err?.message || err) });
});

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';

// --- グローバルエラーハンドラー ---
process.on('uncaughtException', e => { 
  console.error('[FATAL uncaught]', e); 
  process.exit(1); 
});

process.on('unhandledRejection', e => { 
  console.error('[FATAL unhandled]', e); 
  process.exit(1); 
});

// --- サーバー起動 ---
const server = app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[server] environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`[server] API endpoints available at /api/admin/*`);
  
  // PM2起動完了シグナル
  if (typeof process.send === 'function') {
    process.send('ready');
    console.log('[server] PM2 ready signal sent');
  }
});

// --- グレースフルシャットダウン ---
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[server] Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('[server] Process terminated');
    process.exit(0);
  });
});