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
    // データファイル（無ければ空で返す）
    const base = path.join(__dirname, '../data');
    const employees    = readJsonSafe(path.join(base, 'employees.json'), []);
    const departments  = readJsonSafe(path.join(base, 'departments.json'), []);
    const attendance   = readJsonSafe(path.join(base, 'attendance.json'), []);
    const remarks      = readJsonSafe(path.join(base, 'remarks.json'), []);

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
