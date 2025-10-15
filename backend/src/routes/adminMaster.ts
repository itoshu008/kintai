import type { Request, Response, Express } from 'express';
import fs from 'fs';
import path from 'path';

function readJsonSafe<T = any>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

export function mountAdminMaster(app: Express) {
  app.get('/api/admin/master', (req: Request, res: Response) => {
    const date = String(req.query.date ?? '');
    // データファイル（環境変数優先、なければ ../data）
    const DATA_DIR = process.env.KINTAI_DATA_DIR || path.join(__dirname, '../data');
    const employees    = readJsonSafe(path.join(DATA_DIR, 'employees.json'), []);
    const departments  = readJsonSafe(path.join(DATA_DIR, 'departments.json'), []);
    const attendance   = readJsonSafe(path.join(DATA_DIR, 'attendance.json'), []);
    const remarks      = readJsonSafe(path.join(DATA_DIR, 'remarks.json'), []);

    return res.json({
      ok: true,
      date,
      employees,
      departments,
      attendance,
      remarks,
    });
  });
}
