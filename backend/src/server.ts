import 'dotenv/config';
import app from './index.js'; // ← tsc後は .js になるので拡張子 .js

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Port: ${PORT}, Host: ${HOST}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 保険：未処理例外の可視化
process.on('unhandledRejection', (e) => console.error('UnhandledRejection:', e));
process.on('uncaughtException',  (e) => console.error('UncaughtException:', e));


