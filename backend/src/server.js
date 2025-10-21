// backend/src/server.js
require('dotenv').config();
const express = require('express');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { DATA_DIR } = require('./config.js');
const { ensureDir, readJson } = require('./utils/dataStore.js');
const admin = require('./routes/admin/index.js');
const { mysqlAdmin } = require('./routes/admin/mysql.js');
const sessionRouter = require('./routes/session.js');

// 起動時初期化：DATA_DIRとJSONファイルを必ず作成
console.log('🚀 起動時初期化開始...');
ensureDir();
console.log(`📁 DATA_DIR: ${DATA_DIR}`);

// 各JSONファイルの初期化
const files = [
  'departments.json',
  'employees.json', 
  'attendance.json',
  'remarks.json',
  'personal_pages.json'
];

files.forEach(file => {
  const filePath = `${DATA_DIR}/${file}`;
  if (!existsSync(filePath)) {
    console.log(`📄 初期化: ${file}`);
    writeFileSync(filePath, '[]', 'utf-8');
  }
});

// 初期データの読み込み確認
const departments = readJson('departments.json', []);
console.log(`✅ 初期化完了: departments=${departments.length}件`);

const app = express();

// middlewares
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// リクエストログ（切り分けしやすく）
app.use((req, res, next) => { 
  console.log('[REQ]', req.method, req.url); 
  next(); 
});

// health
app.get('/api/admin/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

// API routes
console.log('🔧 ルート登録開始...');
app.use('/api/admin', admin);
console.log('✅ /api/admin ルート登録完了');
app.use('/api/mysql', mysqlAdmin);
console.log('✅ /api/mysql ルート登録完了');
app.use('/api/session', sessionRouter);
console.log('✅ /api/session ルート登録完了');

// API 404 / error handlers (JSON only for /api/*)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
  }
  return next();
});
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(err?.status || 500).json({ ok: false, error: String(err?.message ?? err) });
});

// listen（pm2 wait_ready とペア）
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  if (typeof process.send === 'function') process.send('ready');
});
