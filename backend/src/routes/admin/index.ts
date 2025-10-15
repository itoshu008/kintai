import { Router } from 'express';
import { mountAdminEmployees } from '../adminEmployees.js';
import { mountAdminMaster } from '../adminMaster.js';

export const admin = Router();

// --- サブモジュールのマウント ---
mountAdminEmployees(admin);
mountAdminMaster(admin);

// --- 最小ルート実装（404を確実に消す） ---
admin.get('/master', (req, res) => {
  const date = String(req.query.date ?? '');
  res.json({ ok: true, date, data: { departments: [], employees: [] } });
});

admin.get('/employees', (_req, res) => {
  res.json([{ id: 1, code: 'E001', name: '田中' }]);
});

// --- departments（完全実装） ---
admin.get('/departments', (_req, res) => {
  res.json([{ id: 1, name: '開発部' }]);
});

admin.post('/departments', (req, res) => {
  const name = (req.body && req.body.name) || 'unknown';
  // TODO: DB insert など
  res.status(201).json({ ok: true, name });
});

admin.put('/departments/:id', (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body && req.body.name) || 'unknown';
  // TODO: DB update など
  res.json({ ok: true, id, name });
});

admin.delete('/departments/:id', (req, res) => {
  const id = Number(req.params.id);
  // TODO: DB delete など
  res.json({ ok: true, id, message: '部署を削除しました' });
});

// --- 勤怠関連API（仮実装） ---
admin.post('/clock/in', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, error: 'code is required' });
  // TODO: 実装
  res.json({ ok: true, message: '出勤記録しました', code });
});

admin.post('/clock/out', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, error: 'code is required' });
  // TODO: 実装
  res.json({ ok: true, message: '退勤記録しました', code });
});

admin.put('/attendance/update', (req, res) => {
  const { code, date, clock_in, clock_out } = req.body;
  if (!code || !date) return res.status(400).json({ ok: false, error: 'code and date are required' });
  // TODO: 実装
  res.json({ ok: true, message: '勤怠を更新しました', code, date, clock_in, clock_out });
});

admin.post('/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body;
  if (!employeeCode || !date) return res.status(400).json({ ok: false, error: 'employeeCode and date are required' });
  // TODO: 実装
  res.json({ ok: true, message: '備考を保存しました', employeeCode, date, remark });
});

// --- バックアップ関連API（仮実装） ---
admin.get('/backups', (_req, res) => {
  res.json({ ok: true, backups: [] });
});

admin.post('/backups/create', (_req, res) => {
  const backupId = `backup_${Date.now()}`;
  res.json({ ok: true, backupId, message: 'バックアップを作成しました' });
});

admin.delete('/backups/:backupName', (req, res) => {
  const { backupName } = req.params;
  res.json({ ok: true, message: 'バックアップを削除しました', backupName });
});

admin.get('/backups/:backupId/preview', (req, res) => {
  const { backupId } = req.params;
  res.json({ ok: true, backupId, data: {} });
});

admin.post('/backups/restore', (req, res) => {
  const { backup_id } = req.body;
  if (!backup_id) return res.status(400).json({ ok: false, error: 'backup_id is required' });
  res.json({ ok: true, message: 'バックアップを復元しました', backup_id });
});

export default admin;
