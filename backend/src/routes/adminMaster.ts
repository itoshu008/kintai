import type { Request, Response, Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM でも __dirname を使えるように
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データ置き場（env 優先。無ければ dist から ../data）
const DATA_DIR = process.env.KINTAI_DATA_DIR || path.resolve(__dirname, '../data');

function readJsonSafe<T = any>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

export function mountAdminMaster(app: Express) {
  app.get('/api/admin/master', (req: Request, res: Response) => {
    try {
      const date = String(req.query.date ?? '');
      const employees    = readJsonSafe(path.join(DATA_DIR, 'employees.json'), []);
      const departments  = readJsonSafe(path.join(DATA_DIR, 'departments.json'), []);
      const attendance   = readJsonSafe(path.join(DATA_DIR, 'attendance.json'), []);
      const remarks      = readJsonSafe(path.join(DATA_DIR, 'remarks.json'), []);
      
      res.json({ ok: true, date, employees, departments, attendance, remarks });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: 'master-failed', message: e?.message || String(e) });
    }
  });
}
