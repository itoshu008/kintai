import app from './index.js'; // ← tsc後は .js になるので拡張子 .js

const PORT = Number(process.env.PORT || 8001);
const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
});

// 保険：未処理例外の可視化
process.on('unhandledRejection', (e) => console.error('UnhandledRejection:', e));
process.on('uncaughtException',  (e) => console.error('UncaughtException:', e));

