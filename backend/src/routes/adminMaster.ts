import type { Express, Request, Response } from 'express';
import { readJson } from '../utils/dataStore';

export function mountAdminMaster(app: Express) {
  app.get('/api/admin/master', (req: Request, res: Response) => {
    const date = String(req.query.date ?? '');
    const employees   = readJson('employees.json',   [] as any[]);
    const departments = readJson('departments.json', [] as any[]);
    const attendance  = readJson('attendance.json',  [] as any[]);
    const remarks     = readJson('remarks.json',     [] as any[]);

    return res.json({ ok: true, date, employees, departments, attendance, remarks });
  });
}