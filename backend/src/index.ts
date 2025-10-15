import 'dotenv/config';

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---- ESM/CJS 両対応の __filename/__dirname ----
const __filenameSafe: string =
  (typeof __filename !== 'undefined')
    ? __filename
    : fileURLToPath((import.meta as any).url);
const __dirnameSafe: string =
  (typeof __dirname !== 'undefined')
    ? __dirname
    : path.dirname(__filenameSafe);
import { writeJsonAtomic } from './helpers/writeJsonAtomic.js'; // ← ESMでは拡張子必須
import devRouter from './routes/dev.js'; // 開発用API
import { mountAdminMaster } from './routes/adminMaster.js'; // 管理画面API
import { mountAdminEmployees } from './routes/adminEmployees.js'; // 社員管理API

// ------------------------------------------------------------
// 基盤
// ------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '2mb' }));

// 文字エンコーディング設定
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 開発用API（ON/OFF は環境変数で）
app.use('/api/dev', devRouter);

// 管理画面API
mountAdminMaster(app);

// 社員管理API
mountAdminEmployees(app);

// 環境変数設定
const PORT: number = Number(process.env.PORT) || 8001;
const HOST: string = process.env.HOST || '127.0.0.1';

// データパス（環境変数優先、なければ ../data）
const DATA_DIR = process.env.KINTAI_DATA_DIR || path.resolve(__dirnameSafe, '..', 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json'); // フラットキー: YYYY-MM-DD-コード
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');       // 任意メモ
const HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');     // { "YYYY-MM-DD": "成人の日" }
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// デバッグ用API（データディレクトリ確認）
app.get('/api/admin/_info', (_req: import('express').Request, res: import('express').Response) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV,
    data_dir: DATA_DIR,
    now: new Date().toISOString()
  });
});

// ヘルスチェック
app.get('/api/admin/health', (_req: import('express').Request, res: import('express').Response) => {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// データディレクトリの確保
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// サーバー起動
app.listen(PORT, HOST as any, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});