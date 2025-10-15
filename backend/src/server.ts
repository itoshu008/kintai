// backend/src/server.ts
import 'dotenv/config';

// index 側の export 形が default / named どちらでも動くように吸収
import * as Index from './index';
const app: any =
  (Index as any).default?.listen ? (Index as any).default :
  (Index as any).app?.listen     ? (Index as any).app     :
                                   (Index as any);

if (!app || typeof app.listen !== 'function') {
  console.error('[server] FATAL: index export is not an express app.');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';

process.on('uncaughtException', e => { console.error('[FATAL uncaught]', e); process.exit(1); });
process.on('unhandledRejection', e => { console.error('[FATAL unhandled]', e); process.exit(1); });

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
});