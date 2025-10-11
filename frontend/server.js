/**
 * フロントエンド用静的ファイルサーバー
 * React SPAアプリケーションの配信とヘルスチェック機能を提供
 */
const express = require('express');
const path = require('path');

const app = express();

// 環境変数から設定を取得
const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '127.0.0.1';
const DIST_PATH = path.join(__dirname, 'dist');

// 静的ファイル配信設定
app.use(express.static(DIST_PATH, {
  index: ['index.html'],
  dotfiles: 'ignore',
  etag: false,
  lastModified: false,
  maxAge: 0 // 開発環境ではキャッシュを無効化
}));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'frontend',
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    distPath: DIST_PATH
  });
});

// SPAルーティング対応（すべてのルートをindex.htmlにフォールバック）
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// サーバー起動
const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 Frontend server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving static files from: ${DIST_PATH}`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('🛑 Shutting down frontend server...');
  server.close(() => {
    console.log('✅ Frontend server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down frontend server...');
  server.close(() => {
    console.log('✅ Frontend server closed');
    process.exit(0);
  });
});

// エラーハンドリング
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;

