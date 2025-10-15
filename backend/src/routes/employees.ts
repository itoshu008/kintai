import type { Express, Request, Response } from 'express';
import { readJson, writeJson } from '../utils/dataStore.js';

type Emp = { id?:number; code:string; name:string; department_id:number; is_active?:boolean; created_at?:string; updated_at?:string };

export function mountEmployees(app: Express) {
  // 既存一覧
  app.get('/api/admin/employees', (_:Request, res:Response) => {
    res.json({ ok:true, employees: readJson<Emp[]>('employees.json', []) });
  });

  // コード存在確認
  app.get('/api/admin/employees/:code/exists', (req, res) => {
    const code = String(req.params.code).trim().toUpperCase();
    const list = readJson<Emp[]>('employees.json', []);
    res.json({ ok:true, exists: list.some(e => e.code.toUpperCase() === code) });
  });

  // 新規 or 上書き（?overwrite=true で上書き）
  app.post('/api/admin/employees', (req:Request, res:Response) => {
    const body = req.body as Emp;
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!code) return res.status(400).json({ ok:false, message:'code is required' });

    const overwrite = String(req.query.overwrite ?? '').toLowerCase() === 'true';
    const list = readJson<Emp[]>('employees.json', []);
    const now = new Date().toISOString();

    const idx = list.findIndex(e => e.code.toUpperCase() === code);
    if (idx >= 0 && !overwrite) {
      return res.status(409).json({ ok:false, message:'この社員コードは既に存在します' });
    }

    const emp: Emp = {
      id: idx>=0 ? list[idx].id : (list.at(-1)?.id ?? 0) + 1,
      code,
      name: String(body.name ?? '').trim(),
      department_id: Number(body.department_id ?? 1) || 1,
      is_active: body.is_active ?? true,
      created_at: idx>=0 ? list[idx].created_at : now,
      updated_at: now
    };

    if (idx>=0) list[idx] = emp; else list.push(emp);
    writeJson('employees.json', list);
    res.json({ ok:true, employee:emp, message: idx>=0 ? '社員を更新しました' : '社員が作成されました' });
  });
}
