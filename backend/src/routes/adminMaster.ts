import type { Express, Request, Response } from 'express';
import { readJson } from '../utils/dataStore.js';

export function mountAdminMaster(app: Express) {
  app.get('/api/admin/master', (req: Request, res: Response) => {
    const date = String(req.query.date ?? '');
    const employees   = readJson('employees.json',   [] as any[]);
    const departments = readJson('departments.json', [] as any[]);
    const attendance  = readJson('attendance.json',  [] as any[]);
    const remarks     = readJson('remarks.json',     [] as any[]);

    // フロントエンドが期待する形式に合わせる
    return res.json({ 
      ok: true, 
      date, 
      employees, 
      departments, 
      attendance, 
      remarks,
      // 互換性のため list も含める
      list: employees
    });
  });
}