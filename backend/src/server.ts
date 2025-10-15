import 'dotenv/config';
import app from './index.js'; // ← ESMでは拡張子必須
import { PORT, HOST } from './config.js';

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  console.log(`[SERVER] Port: ${PORT}, Host: ${HOST}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 保険：未処理例外の可視化
process.on('unhandledRejection', (e) => console.error('UnhandledRejection:', e));
process.on('uncaughtException',  (e) => console.error('UncaughtException:', e));


