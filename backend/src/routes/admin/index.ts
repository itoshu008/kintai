// backend/src/routes/admin/index.ts
import { Router } from 'express';
export const admin = Router();

admin.get('/master', (req, res) => {
  const date = String(req.query.date ?? '');
  res.json({ ok: true, date, data: { departments: [], employees: [] } });
});

admin.get('/employees', (_req, res) => {
  res.json([{ id: 1, code: 'E001', name: '田中' }]);
});

export default admin;
