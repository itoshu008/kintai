import { Router } from 'express';
export const admin = Router();

// --- departments（仮実装/本実装はDBへ差し替え） ---
admin.get('/departments', (_req, res) => {
  res.json([{ id: 1, name: '開発部' }]);
});
admin.post('/departments', (req, res) => {
  const name = (req.body && req.body.name) || 'unknown';
  // TODO: DB insert など
  res.status(201).json({ ok: true, name });
});

// 他のサブモジュールがあれば admin.use('/xxx', xxxRouter);
export default admin;
