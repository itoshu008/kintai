// src/index.ts
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { writeJsonAtomic } from './helpers/writeJsonAtomic.js';

// （任意）バックアップ健康チェックだけ別ファイルなら使う
// import { registerBackupsHealth } from './backupsHealth.js';

const app = express();
app.use(express.json());

// ---- 基本ヘルス ----
app.get('/__ping', (_req, res) => res.type('text/plain').send('pong'));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// ---- ここから互換ミニ版：データ読み取りだけ実装 ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');

function safeReadJSON<T>(file: string, fallback: T): T {
  try {
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf8')) as T;
    }
  } catch {
    // 破損時はフォールバック
  }
  return fallback;
}

type Dept = { id: number; name: string };
type Emp = { id: number; code: string; name: string; dept?: string; department_id?: number | null };
type AttendanceRow = {
  clock_in?: string | null;
  clock_out?: string | null;
  late?: number; early?: number; overtime?: number; night?: number; work_minutes?: number;
};

const departments: Dept[] = safeReadJSON(DEPARTMENTS_FILE, []);
const employees: Emp[] = safeReadJSON(EMPLOYEES_FILE, []);
const attendanceData: Record<string, AttendanceRow> = safeReadJSON(ATTENDANCE_FILE, {});
const holidays: Record<string, string> = safeReadJSON(HOLIDAYS_FILE, {});
const remarksData: Record<string, string> = safeReadJSON(REMARKS_FILE, {});

const deptIndex = new Map<number, Dept>(departments.map(d => [d.id, d]));

const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
};
const isHoliday = (dateStr: string) => Boolean(holidays[dateStr]);
const getHolidayName = (dateStr: string) => holidays[dateStr] || null;
const isWorkingDay = (dateStr: string) => !isWeekend(dateStr) && !isHoliday(dateStr);

function today(): string { return new Date().toISOString().slice(0, 10); }

// --- 主要API（読み取り専用）---

// 社員一覧（dept名の解決を含む）
app.get('/api/admin/employees', (_req, res) => {
  const list = employees.map(e => {
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '未所属')
      : (e.dept ?? '未所属');
    return { ...e, dept };
  });
  res.json({ list });
});

// マスター（指定日の勤怠まとめ）
app.get('/api/admin/master', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const sorted = [...employees].sort((a, b) => a.code.localeCompare(b.code));
  const list = sorted.map(e => {
    const key = `${date}-${e.code}`;
    const at = attendanceData[key] || {};
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '未所属')
      : (e.dept ?? '未所属');
    
    return {
      id: e.id,
      code: e.code,
      name: e.name,
      dept,
      department_id: e.department_id ?? null,
      clock_in: at.clock_in ?? null,
      clock_out: at.clock_out ?? null,
      status: at.clock_in ? (at.clock_out ? '退勤済み' : '出勤中') : '未出勤',
      late: at.late ?? 0,
      early: at.early ?? 0,
      overtime: at.overtime ?? 0,
      night: at.night ?? 0,
      isWeekend: isWeekend(date),
      isHoliday: isHoliday(date),
      holidayName: getHolidayName(date),
      isWorkingDay: isWorkingDay(date),
    };
  });
  res.json({ ok: true, date, list });
});

// 勤怠一覧（指定日）
app.get('/api/admin/attendance', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const list = [...employees].sort((a, b) => a.code.localeCompare(b.code)).map(e => {
    const key = `${date}-${e.code}`;
    const at = attendanceData[key] || {};
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '未所属')
      : (e.dept ?? '未所属');
      return {
      id: e.id,
      code: e.code,
      name: e.name,
      dept,
      department_id: e.department_id ?? null,
      clock_in: at.clock_in ?? null,
      clock_out: at.clock_out ?? null,
      status: at.clock_in && at.clock_out ? '退勤' : at.clock_in ? '出勤中' : '未出勤',
      remark: ''
      };
    });
  res.json({ ok: true, date, list });
});

// （任意）バックアップの"ヘルス"だけはここで完結
app.get('/api/admin/backups/health', (_req, res) => {
  try {
    const enabled = (process.env.BACKUP_ENABLED ?? '1') !== '0';
    const intervalMinutes = parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? '60', 10);
    const maxKeep = parseInt(process.env.BACKUP_MAX_KEEP ?? '24', 10);
    res.json({ ok: true, enabled, intervalMinutes, maxKeep });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- 備考API（読み書き） ---

// 備考取得
app.get('/api/admin/remarks/:employeeCode/:date', (req, res) => {
  const key = `${req.params.date}-${req.params.employeeCode}`;
  res.json({ ok: true, remark: remarksData[key] || '' });
});

// 備考保存
app.post('/api/admin/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body || {};
  if (!employeeCode || !date) return res.status(400).json({ ok: false, error: 'employeeCode and date required' });
  const key = `${date}-${employeeCode}`;
  remarksData[key] = String(remark || '');
  writeJsonAtomic(REMARKS_FILE, remarksData);
  res.json({ ok: true });
});

// --- 打刻API（冪等） ---

// 出勤打刻
app.post('/api/public/clock-in', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code required' });
  const emp = employees.find(e => e.code === code);
  if (!emp) return res.status(404).json({ ok: false, error: 'Employee not found' });

  const key = `${today()}-${code}`;
  const now = new Date();
  const rec = attendanceData[key] || {};
  if (rec.clock_in) return res.json({ ok: true, idempotent: true, time: rec.clock_in });

  const start = new Date(now); start.setHours(10, 0, 0, 0);
  const late = now > start ? Math.floor((+now - +start) / 60000) : 0;
  attendanceData[key] = { ...rec, clock_in: now.toISOString(), late };
  writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
  res.json({ ok: true, late });
});

// 退勤打刻
app.post('/api/public/clock-out', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code required' });
  const emp = employees.find(e => e.code === code);
  if (!emp) return res.status(404).json({ ok: false, error: 'Employee not found' });

  const key = `${today()}-${code}`;
  const rec = attendanceData[key];
  if (!rec?.clock_in) return res.status(400).json({ ok: false, error: 'No clock-in' });
  if (rec.clock_out) return res.json({ ok: true, idempotent: true, time: rec.clock_out });

  const now = new Date();
  const inAt = new Date(rec.clock_in);
  const workEnd = new Date(now); workEnd.setHours(18, 0, 0, 0);
  const early = now < workEnd ? Math.floor((+workEnd - +now) / 60000) : 0;
  const overtime = now > workEnd ? Math.floor((+now - +workEnd) / 60000) : 0;
  const nightStart = new Date(now); nightStart.setHours(22, 0, 0, 0);
  const night = now > nightStart ? Math.floor((+now - +nightStart) / 60000) : 0;
  const work_minutes = Math.max(0, Math.floor((+now - +inAt) / 60000));

  attendanceData[key] = { ...rec, clock_out: now.toISOString(), early, overtime, night, work_minutes };
  writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
  res.json({ ok: true, early, overtime, night, work_minutes });
});

// ---- 静的配信（SPA） ----
const FRONTEND_PATH =
  process.env.FRONTEND_PATH
  || path.resolve(__dirname, '../../public');

if (existsSync(path.join(FRONTEND_PATH, 'index.html'))) {
  app.use(express.static(FRONTEND_PATH, {
    index: ['index.html'],
    dotfiles: 'ignore',
    etag: false,
    lastModified: false,
    maxAge: 0
  }));

  // SPAのルーティング：/api 以外は index.html
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not implemented' });
    }
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
  });
  } else {
  console.warn('⚠️ FRONTEND not found:', FRONTEND_PATH);
}

// ---- 起動 ----
const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '8001', 10);

const server = app.listen(PORT, HOST, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));