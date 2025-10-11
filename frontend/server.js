// frontend/server.js - フロントエンド用静的ファイルサーバー
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// 静的ファイルを配信
app.use(express.static(path.join(__dirname, 'dist')));

// SPAのためのフォールバック（すべてのルートをindex.htmlに）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'frontend',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 Frontend server running on http://${HOST}:${PORT}`);
});

// エラーハンドリング
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;

