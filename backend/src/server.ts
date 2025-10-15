import 'dotenv/config';
import * as Index from './index.js';

// 環境変数優先、なければ 0.0.0.0:8001
const PORT: number = Number(process.env.PORT) || 8001;
const HOST: string = process.env.HOST || '0.0.0.0';

// index のどの形でも受け取れるように吸収
const app: any =
  (Index as any).default?.listen ? (Index as any).default :
  (Index as any).app?.listen     ? (Index as any).app     :
                                   (Index as any);

if (!app || typeof app.listen !== 'function') {
  console.error('[server] FATAL: index export is not an express app (need default export or { app }).');
  process.exit(1);
}

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
});

// 保険：未処理例外の可視化
process.on('unhandledRejection', (e) => console.error('UnhandledRejection:', e));
process.on('uncaughtException',  (e) => console.error('UncaughtException:', e));


