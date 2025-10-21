require('dotenv').config();
const express = require('express');
const admin = require('./routes/admin');           // ← 実際のパスに合わせて
const app = express();

app.use(express.json({ limit: '2mb' }));

// リクエスト簡易ログ（切り分け用）
app.use((req, res, next) => { 
  console.log('[REQ]', req.method, req.url); 
  next(); 
});

// ヘルス
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 管理APIを /api/admin にマウント（必須）
app.use('/api/admin', admin);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`[server] listening on http://0.0.0.0:${PORT}`));
