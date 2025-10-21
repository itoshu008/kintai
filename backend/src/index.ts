import 'dotenv/config';
import express from 'express';
import admin from './routes/admin/index.js'; // 実際のパスに合わせて
import sessionRouter from './routes/session.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// リクエスト簡易ログ
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ヘルスチェック
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 管理API
app.use('/api/admin', admin);

// セッションAPI
app.use('/api/session', sessionRouter);

// エラーハンドラ（落ちても200で原因を返す）
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[UNHANDLED]', err);
  res.status(200).json({ ok: false, error: 'unhandled error', detail: String(err?.message ?? err) });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`[server] listening on http://0.0.0.0:${PORT}`));