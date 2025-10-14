// src/index.ts
// ------------------------------------------------------------
// 全機能・簡略安全版（フロント互換レスポンス・ESM/TS対応・SPA配信）
// ------------------------------------------------------------

import 'dotenv/config';

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---- ESM/CJS 両対応の __filename/__dirname ----
const __filenameSafe: string =
  (typeof __filename !== 'undefined')
    ? __filename
    : fileURLToPath((import.meta as any).url);
const __dirnameSafe: string =
  (typeof __dirname !== 'undefined')
    ? __dirname
    : path.dirname(__filenameSafe);
import { writeJsonAtomic } from './helpers/writeJsonAtomic'; // ← CJSでは拡張子不要

// ------------------------------------------------------------
// 基盤
// ------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '2mb' }));

// 環境変数設定
const PORT: number = Number(process.env.PORT) || 8001;
const HOST: string = process.env.HOST || '127.0.0.1';

// データパス
const DATA_DIR = path.resolve(__dirnameSafe, '..', 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json'); // フラットキー: YYYY-MM-DD-コード
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');       // 任意メモ
const HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');     // { "YYYY-MM-DD": "成人の日" }
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// フロント配信パス（優先: env → public/ → frontend/dist）
const FRONTEND_PATH = (() => {
  const envPath = process.env.FRONTEND_PATH ? path.resolve(process.env.FRONTEND_PATH) : null;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const pub = path.resolve(__dirnameSafe, '..', '..', 'public');
  if (fs.existsSync(pub)) return pub;
  const dist = path.resolve(__dirnameSafe, '..', '..', 'frontend', 'dist');
  return dist;
})();

// ユーティリティ
function safeReadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const txt = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(txt) as T;
  } catch (e) {
    console.error('[safeReadJSON] Failed:', filePath, e);
    return fallback;
  }
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function sortBy<T>(arr: T[], key: (x: T) => number | string, desc = false): T[] {
  return [...arr].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

// ------------------------------------------------------------
// 起動時ロード（インメモリ）
// ------------------------------------------------------------
ensureDir(DATA_DIR);
const employees: any[] = safeReadJSON<any[]>(EMPLOYEES_FILE, []);
const departments: any[] = safeReadJSON<any[]>(DEPARTMENTS_FILE, []);
const attendanceData: Record<string, any> = safeReadJSON<Record<string, any>>(ATTENDANCE_FILE, {});
const remarksData: Record<string, string> = safeReadJSON<Record<string, string>>(REMARKS_FILE, {});
const holidays: Record<string, string> = safeReadJSON<Record<string, string>>(HOLIDAYS_FILE, {});
const deptIndex = new Map<number, any>(departments.map(d => [d.id, d]));

// 簡易セッション（メモリ）
const sessions = new Map<string, { user: any; createdAt: Date; expiresAt: Date }>();

// ------------------------------------------------------------
// 静的配信（APIより前に）
// ------------------------------------------------------------
if (fs.existsSync(FRONTEND_PATH)) {
  app.use(
    express.static(FRONTEND_PATH, {
      index: ['index.html'],
      dotfiles: 'ignore',
      etag: false,
      lastModified: false,
      maxAge: 0,
    }),
  );
  console.log(`[STATIC] ✅ Serving frontend from: ${FRONTEND_PATH}`);
} else {
  console.warn(`[STATIC] ⚠️ FRONTEND_PATH not found: ${FRONTEND_PATH}`);
  console.warn(`[STATIC] Build frontend: (cd frontend && npm run build) then copy to public/`);
}

// ------------------------------------------------------------
// ヘルス
// ------------------------------------------------------------
app.get('/__ping', (_req: import('express').Request, res: import('express').Response) => res.type('text/plain').send('pong'));

app.get('/api/health', (_req: import('express').Request, res: import('express').Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/admin/health', (_req: import('express').Request, res: import('express').Response) => {
  try {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    });
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : e);
    res.status(200).json({ ok: false, status: 'unhealthy', error: String(e) });
  }
});

// ------------------------------------------------------------
// 管理トップ
// ------------------------------------------------------------
app.get('/api/admin', (_req: import('express').Request, res: import('express').Response) => {
  res.json({
    ok: true,
    message: 'Admin endpoint is working!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: [
      'GET /api/admin/health',
      'GET /api/admin/departments',
      'POST /api/admin/departments',
      'PUT /api/admin/departments/:id',
      'DELETE /api/admin/departments/:id',
      'GET /api/admin/employees',
      'POST /api/admin/employees',
      'PUT /api/admin/employees/:code',
      'DELETE /api/admin/employees/:key (code or id)',
      'GET /api/admin/master',
      'GET /api/admin/attendance',
      'POST /api/attendance/checkin',
      'POST /api/attendance/checkout',
      'GET /api/admin/remarks/:employeeCode/:date',
      'POST /api/admin/remarks',
      'GET /api/admin/weekly',
      'GET /api/admin/remarks/:employeeCode?month=YYYY-MM',
      'GET /api/admin/holidays',
      'GET /api/admin/holidays/:date',
      'POST /api/admin/sessions',
      'GET /api/admin/sessions/:sessionId',
      'DELETE /api/admin/sessions/:sessionId',
      'POST /api/admin/backups',
      'GET /api/admin/backups',
      'GET /api/admin/backups/:id',
      'GET /api/admin/backups/:id/preview',
      'POST /api/admin/backups/:id/restore',
      'DELETE /api/admin/backups/:id',
      'POST /api/admin/backups/cleanup',
    ],
  });
});

// ------------------------------------------------------------
// セッション（簡易・メモリ保持）
// ------------------------------------------------------------
app.post('/api/admin/sessions', (req, res) => {
  try {
    const { code, name, department, rememberMe } = req.body || {};
    if (!code || !name) {
      return res.status(200).json({ ok: false, error: 'ユーザー情報が不完全です' });
    }
    const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
    const user = { code, name, department };
    sessions.set(sessionId, { user, createdAt: now, expiresAt });
    res.json({ ok: true, sessionId, user, message: 'セッションが保存されました' });
  } catch (e) {
    res.status(200).json({ ok: false, error: 'セッション保存に失敗しました' });
  }
});

app.get('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const s = sessions.get(req.params.sessionId);
    if (!s) return res.status(200).json({ ok: false, error: 'セッションが見つかりません' });
    if (new Date() > s.expiresAt) {
      sessions.delete(req.params.sessionId);
      return res.status(200).json({ ok: false, error: 'セッションが期限切れです' });
    }
    res.json({ ok: true, user: s.user, message: 'セッションが取得されました' });
  } catch (e) {
    res.status(200).json({ ok: false, error: 'セッション取得に失敗しました' });
  }
});

app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const del = sessions.delete(req.params.sessionId);
    res.json({ ok: true, message: del ? 'セッションが削除されました' : 'セッション無し' });
  } catch {
    res.status(200).json({ ok: false, error: 'セッション削除に失敗しました' });
  }
});

// ------------------------------------------------------------
// 部署 CRUD
// ------------------------------------------------------------
app.get('/api/admin/departments', (_req, res) => {
  try {
    res.json({ ok: true, departments });
  } catch {
    res.status(200).json({ ok: false, error: '部署の取得に失敗しました' });
  }
});

app.post('/api/admin/departments', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(200).json({ ok: false, error: '部署名は必須です' });
    }
    if (departments.some(d => d.name === String(name).trim())) {
      return res.status(200).json({ ok: false, error: '同名の部署が既に存在します' });
    }
    const newId = departments.length ? Math.max(...departments.map(d => d.id || 0)) + 1 : 1;
    const dep = { id: newId, name: String(name).trim() };
    departments.push(dep);
    deptIndex.set(newId, dep);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    res.json({ ok: true, department: dep, message: '部署が作成されました', timestamp: new Date().toISOString() });
  } catch {
    res.status(200).json({ ok: false, error: '部署の作成に失敗しました' });
  }
});

app.put('/api/admin/departments/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    if (!Number.isFinite(id)) return res.status(200).json({ ok: false, error: '無効な部署IDです' });
    if (!name || !String(name).trim()) return res.status(200).json({ ok: false, error: '部署名は必須です' });
    const idx = departments.findIndex(d => d.id === id);
    if (idx === -1) return res.status(200).json({ ok: false, error: '部署が見つかりません' });
    if (departments.some(d => d.name === String(name).trim() && d.id !== id)) {
      return res.status(200).json({ ok: false, error: '同名の部署が既に存在します' });
    }
    departments[idx].name = String(name).trim();
    deptIndex.set(id, departments[idx]);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    res.json({ ok: true, department: departments[idx], message: '部署が更新されました' });
  } catch {
    res.status(200).json({ ok: false, error: '部署の更新に失敗しました' });
  }
});

app.delete('/api/admin/departments/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(200).json({ ok: false, error: '無効な部署IDです' });
    if (employees.some(e => e.department_id === id)) {
      const cnt = employees.filter(e => e.department_id === id).length;
      return res.status(200).json({ ok: false, error: `この部署には${cnt}名の社員が所属しています。先に社員の部署を変更してください。` });
    }
    const idx = departments.findIndex(d => d.id === id);
    if (idx === -1) return res.status(200).json({ ok: false, error: '部署が見つかりません' });
    const removed = departments.splice(idx, 1)[0];
    deptIndex.delete(id);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    res.json({ ok: true, message: '部署が削除されました', department: removed });
  } catch {
    res.status(200).json({ ok: false, error: '部署の削除に失敗しました' });
  }
});

// ------------------------------------------------------------
// 社員 CRUD（フロント互換: GETは employees と list の両方を返す）
// ------------------------------------------------------------
// ------------------------------------------------------------
// 社員 CRUD（フロント互換: GETは employees と list の両方を返す）
// ------------------------------------------------------------
app.get('/api/admin/employees', (_req, res) => {
  const list = employees.map(e => {
    const dept =
      e.department_id != null
        ? deptIndex.get(e.department_id)?.name ?? '未所属'
        : e.dept ?? '未所属';
    return { ...e, dept };
  });
  res.json({ ok: true, employees: list, list });
});

app.post('/api/admin/employees', (req, res) => {
  try {
    const { code, name, department_id } = req.body || {};
    if (!code || !name)
      return res.status(400).json({ ok: false, error: 'codeとnameは必須です' });

    if (employees.some(e => e.code === String(code).trim())) {
      return res
        .status(409)
        .json({ ok: false, error: 'この社員コードは既に存在します' });
    }

    const now = new Date().toISOString();
    const emp = {
      id: employees.length
        ? Math.max(...employees.map(e => e.id || 0)) + 1
        : 1,
      code: String(code).trim(),
      name: String(name).trim(),
      department_id: department_id ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    employees.push(emp);
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    res.json({ ok: true, employee: emp, message: '社員が作成されました' });
  } catch (e) {
    console.error('社員作成エラー:', e);
    res.status(500).json({ ok: false, error: '社員の作成に失敗しました' });
  }
});

// === 社員更新（codeでもidでもOK）===
app.put('/api/admin/employees/:key', (req, res) => {
  try {
    const { key } = req.params;
    let idx = employees.findIndex(e => e.code === key);

    // 数字の場合、idでも検索
    if (idx === -1 && /^\d+$/.test(key)) {
      const id = Number(key);
      idx = employees.findIndex(e => e.id === id);
    }

    if (idx === -1)
      return res
        .status(404)
        .json({ ok: false, error: '社員が見つかりません' });

    const patch = req.body || {};

    // code変更時の重複チェック
    if (patch.code && patch.code !== employees[idx].code) {
      const dup = employees.some(e => e.code === patch.code);
      if (dup)
        return res
          .status(409)
          .json({ ok: false, error: 'この社員コードは既に存在します' });
    }

    employees[idx] = {
      ...employees[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    res.json({
      ok: true,
      employee: employees[idx],
      message: '社員が更新されました',
    });
  } catch (e) {
    console.error('社員更新エラー:', e);
    res.status(500).json({ ok: false, error: '社員の更新に失敗しました' });
  }
});

// === 社員削除（codeでもidでもOK）===
app.delete('/api/admin/employees/:key', (req, res) => {
  try {
    const { key } = req.params;
    let idx = employees.findIndex(e => e.code === key);

    // 数字の場合、idでも検索
    if (idx === -1 && /^\d+$/.test(key)) {
      const id = Number(key);
      idx = employees.findIndex(e => e.id === id);
    }

    if (idx === -1)
      return res
        .status(404)
        .json({ ok: false, error: '社員が見つかりません' });

    const removed = employees.splice(idx, 1)[0];
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    res.json({
      ok: true,
      employee: removed,
      message: '社員が削除されました',
    });
  } catch (e) {
    console.error('社員削除エラー:', e);
    res.status(500).json({ ok: false, error: '社員の削除に失敗しました' });
  }
});

// ------------------------------------------------------------
// 管理用打刻（冪等）
// ------------------------------------------------------------
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { code, note } = req.body || {};
    if (!code) return res.status(200).json({ ok: false, error: '社員コードが必要です' });
    const key = `${todayStr()}-${code}`;
    const rec = attendanceData[key] || {};
    if (rec.checkin || rec.clock_in) {
      return res.json({ ok: true, idempotent: true, checkin: rec.checkin || rec.clock_in });
    }
    const nowISO = new Date().toISOString();
    const start = new Date(); start.setHours(10, 0, 0, 0);
    const late = new Date() > start ? Math.floor((+new Date() - +start) / 60000) : 0;
    attendanceData[key] = { ...rec, code, checkin: nowISO, clock_in: nowISO, late, note: note || null };
    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
    res.json({ ok: true, message: '出勤打刻が完了しました', checkin: nowISO, late });
  } catch {
    res.status(200).json({ ok: false, error: '出勤打刻に失敗しました' });
  }
});

app.post('/api/attendance/checkout', (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(200).json({ ok: false, error: '社員コードが必要です' });
    const key = `${todayStr()}-${code}`;
    const rec = attendanceData[key] || {};
    const cin = rec.checkin || rec.clock_in;
    if (!cin) return res.status(200).json({ ok: false, error: '出勤打刻がされていません' });
    if (rec.checkout || rec.clock_out) {
      return res.json({ ok: true, idempotent: true, checkout: rec.checkout || rec.clock_out });
    }
    const now = new Date();
    const checkoutISO = now.toISOString();
    const diffMin = Math.floor((+now - +new Date(cin)) / 60000);
    const workHours = Math.floor(diffMin / 60);
    const workMinutes = diffMin % 60;
    attendanceData[key] = {
      ...rec,
      checkout: checkoutISO,
      clock_out: checkoutISO,
      total_minutes: diffMin,
      work_hours: workHours,
      work_minutes: workMinutes,
    };
    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
    res.json({
      ok: true,
      message: '退勤打刻が完了しました',
      checkout: checkoutISO,
      work_hours: workHours,
      work_minutes: workMinutes,
      total_minutes: diffMin,
    });
  } catch {
    res.status(200).json({ ok: false, error: '退勤打刻に失敗しました' });
  }
});

// ------------------------------------------------------------
// 備考
// ------------------------------------------------------------
app.get('/api/admin/remarks/:employeeCode/:date', (req, res) => {
  const key = `${req.params.date}-${req.params.employeeCode}`;
  res.json({ ok: true, remark: remarksData[key] || '' });
});

app.post('/api/admin/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body || {};
  if (!employeeCode || !date) return res.status(200).json({ ok: false, error: 'employeeCode and date required' });
  const key = `${date}-${employeeCode}`;
  remarksData[key] = String(remark || '');
  writeJsonAtomic(REMARKS_FILE, remarksData);
  res.json({ ok: true, message: '備考を保存しました' });
});

// ------------------------------------------------------------
// 祝日
// ------------------------------------------------------------
app.get('/api/admin/holidays', (_req, res) => {
  try {
    res.json({ ok: true, holidays });
  } catch {
    res.status(200).json({ ok: false, error: '祝日データの取得に失敗しました' });
  }
});

app.get('/api/admin/holidays/:date', (req, res) => {
  try {
    const d = req.params.date;
    const isHoliday = holidays[d] !== undefined;
    res.json({ ok: true, date: d, isHoliday, holidayName: holidays[d] || null });
  } catch {
    res.status(200).json({ ok: false, error: '祝日チェックに失敗しました' });
  }
});

// ------------------------------------------------------------
// 週次レポート（attendanceData はフラットキー）
// ------------------------------------------------------------
app.get('/api/admin/weekly', (req, res) => {
  try {
    const { start } = req.query;
    const base = start ? new Date(String(start)) : new Date();
    const dow = base.getDay(); // 0:日
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));

    const weekData: Array<{
      date: string;
      totalEmployees: number;
      presentEmployees: number;
      lateEmployees: number;
      absentEmployees: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const dayEntries = Object.entries(attendanceData)
        .filter(([k]) => k.startsWith(`${dateStr}-`))
        .map(([, v]) => v as any);

      const present = dayEntries.length;
      const late = dayEntries.filter(rec => (rec.late ?? 0) > 0).length;

      weekData.push({
        date: dateStr,
        totalEmployees: employees.length,
        presentEmployees: present,
        lateEmployees: late,
        absentEmployees: Math.max(employees.length - present, 0),
      });
    }

    res.json({ ok: true, weekData, startDate: monday.toISOString().slice(0, 10) });
  } catch {
    res.status(200).json({ ok: false, error: '週次レポートの取得に失敗しました' });
  }
});

// ------------------------------------------------------------
// 月別備考（社員単位、YYYY-MM）
// ------------------------------------------------------------
app.get('/api/admin/remarks/:employeeCode', (req, res) => {
  try {
    const employeeCode = String(req.params.employeeCode);
    const month = String((req.query.month as string) || new Date().toISOString().slice(0, 7)); // YYYY-MM
    const out: Array<{ date: string; remark: string }> = [];

    for (const [key, rec] of Object.entries(attendanceData)) {
      if (!key.startsWith(month)) continue; // 'YYYY-MM' 前方一致
      // key: YYYY-MM-DD-<code>
      const parts = key.split('-');
      if (parts.length < 4) continue;
      const date = parts.slice(0, 3).join('-');
      const code = parts.slice(3).join('-'); // コードに '-' を含まない前提
      if (code === employeeCode && (rec as any).remark) {
        out.push({ date, remark: String((rec as any).remark) });
      }
    }

    res.json({ ok: true, employeeCode, month, remarks: out });
  } catch {
    res.status(200).json({ ok: false, error: '月別備考の取得に失敗しました' });
  }
});

// ------------------------------------------------------------
// バックアップ（作成・一覧・詳細・プレビュー・復元・削除・クリーンアップ）
// ※ マスターページでは基本は「閲覧専用ボタン」を使う想定
// ------------------------------------------------------------
type BackupMeta = {
  id: string;            // 例: 2025-10-12T16-40-59Z
  createdAt: string;     // ISO
  files: string[];       // 含まれるJSON
  sizeBytes: number;     // 合計サイズ
};
ensureDir(BACKUP_DIR);

function makeBackupId(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, '-'); // ファイル名OKな形
}

app.post('/api/admin/backups', (_req, res) => {
  try {
    ensureDir(BACKUP_DIR);
    const id = makeBackupId(new Date());
    const dir = path.join(BACKUP_DIR, id);
    ensureDir(dir);

    // 現在の全データを取得
    const snap = {
      employees,
      departments,
      attendanceData,
      remarksData,
      holidays,
    };

    // データ保存
    const dataFile = path.join(dir, 'snapshot.json');
    fs.writeFileSync(dataFile, JSON.stringify(snap, null, 2));

    // メタ保存
    const meta: BackupMeta = {
      id,
      createdAt: new Date().toISOString(),
      files: ['snapshot.json'],
      sizeBytes: fs.statSync(dataFile).size,
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));

    res.json({ ok: true, message: 'バックアップが正常に作成されました', backup: meta });
  } catch (e) {
    console.error('[BACKUP] create error', e);
    res.status(200).json({ ok: false, error: 'バックアップ作成に失敗しました' });
  }
});

app.get('/api/admin/backups', (_req, res) => {
  try {
    ensureDir(BACKUP_DIR);
    const dirs = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const metas: BackupMeta[] = [];
    for (const id of dirs) {
      const metaPath = path.join(BACKUP_DIR, id, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = safeReadJSON<BackupMeta>(metaPath, null as any);
      if (meta) metas.push(meta);
    }

    // 新しい順
    const ordered = sortBy(metas, m => m.id, true);

    // 自動クリーン（最新10件を残す）
    const keep = 10;
    if (ordered.length > keep) {
      for (const m of ordered.slice(keep)) {
        const p = path.join(BACKUP_DIR, m.id);
        try {
          fs.rmSync(p, { recursive: true, force: true });
        } catch (e) {
          console.warn('[BACKUP] auto-clean failed:', p, e);
        }
      }
    }

    res.json({ ok: true, backups: ordered.slice(0, keep) });
  } catch (e) {
    console.error('[BACKUP] list error', e);
    res.status(200).json({ ok: false, error: 'バックアップ一覧の取得に失敗しました' });
  }
});

app.get('/api/admin/backups/:id', (req, res) => {
  try {
    const id = req.params.id;
    const meta = safeReadJSON<BackupMeta>(path.join(BACKUP_DIR, id, 'meta.json'), null as any);
    if (!meta) return res.status(200).json({ ok: false, error: 'バックアップが見つかりません' });
    res.json({ ok: true, backup: meta });
  } catch {
    res.status(200).json({ ok: false, error: 'バックアップ詳細の取得に失敗しました' });
  }
});

app.get('/api/admin/backups/:id/preview', (req, res) => {
  try {
    const id = req.params.id;
    const dataPath = path.join(BACKUP_DIR, id, 'snapshot.json');
    if (!fs.existsSync(dataPath)) return res.status(200).json({ ok: false, error: 'バックアップが見つかりません' });
    const snap = safeReadJSON<any>(dataPath, null as any);
    res.json({ ok: true, preview: snap, message: 'プレビューモード：データは復元されません' });
  } catch {
    res.status(200).json({ ok: false, error: 'バックアッププレビューに失敗しました' });
  }
});

app.post('/api/admin/backups/:id/restore', (req, res) => {
  try {
    const id = req.params.id;
    const dataPath = path.join(BACKUP_DIR, id, 'snapshot.json');
    if (!fs.existsSync(dataPath)) return res.status(200).json({ ok: false, error: 'バックアップが見つかりません' });

    // 復元前に現在のスナップショットを別バックアップ（安全策）
    const safeId = `pre-restore-${makeBackupId(new Date())}`;
    const safeDir = path.join(BACKUP_DIR, safeId);
    ensureDir(safeDir);
    fs.writeFileSync(
      path.join(safeDir, 'snapshot.json'),
      JSON.stringify({ employees, departments, attendanceData, remarksData, holidays }, null, 2),
    );
    fs.writeFileSync(
      path.join(safeDir, 'meta.json'),
      JSON.stringify(
        {
          id: safeId,
          createdAt: new Date().toISOString(),
          files: ['snapshot.json'],
          sizeBytes: fs.statSync(path.join(safeDir, 'snapshot.json')).size,
        } satisfies BackupMeta,
        null,
        2,
      ),
    );

    // 復元
    const snap = safeReadJSON<any>(dataPath, null as any);
    if (!snap) return res.status(200).json({ ok: false, error: 'バックアップが破損しています' });

    // メモリ上を書き換え
    employees.splice(0, employees.length, ...(snap.employees || []));
    departments.splice(0, departments.length, ...(snap.departments || []));
    Object.keys(attendanceData).forEach(k => delete attendanceData[k]);
    Object.assign(attendanceData, snap.attendanceData || {});
    Object.keys(remarksData).forEach(k => delete remarksData[k]);
    Object.assign(remarksData, snap.remarksData || {});
    Object.keys(holidays).forEach(k => delete holidays[k]);
    Object.assign(holidays, snap.holidays || {});
    // 部署インデックス再構築
    deptIndex.clear();
    for (const d of departments) deptIndex.set(d.id, d);

    // ファイルに保存
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
    writeJsonAtomic(REMARKS_FILE, remarksData);
    writeJsonAtomic(HOLIDAYS_FILE, holidays);

    res.json({ ok: true, message: `バックアップ ${id} から復元しました` });
  } catch (e) {
    console.error('[BACKUP] restore error', e);
    res.status(200).json({ ok: false, error: 'バックアップ復元に失敗しました' });
  }
});

app.delete('/api/admin/backups/:id', (req, res) => {
  try {
    const id = req.params.id;
    const dir = path.join(BACKUP_DIR, id);
    if (!fs.existsSync(dir)) return res.status(200).json({ ok: false, error: 'バックアップが見つかりません' });
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true, message: `バックアップ ${id} を削除しました` });
  } catch {
    res.status(200).json({ ok: false, error: 'バックアップ削除に失敗しました' });
  }
});

app.post('/api/admin/backups/cleanup', (_req, res) => {
  try {
    ensureDir(BACKUP_DIR);
    const dirs = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const metas: BackupMeta[] = [];
    for (const id of dirs) {
      const metaPath = path.join(BACKUP_DIR, id, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = safeReadJSON<BackupMeta>(metaPath, null as any);
      if (meta) metas.push(meta);
    }
    const ordered = sortBy(metas, m => m.id, true);
    const keep = 10;
    for (const m of ordered.slice(keep)) {
      const p = path.join(BACKUP_DIR, m.id);
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch (e) {
        console.warn('[BACKUP] cleanup failed:', p, e);
      }
    }
    res.json({ ok: true, kept: ordered.slice(0, keep).map(m => m.id) });
  } catch {
    res.status(200).json({ ok: false, error: 'バックアップクリーンアップに失敗しました' });
  }
});

// ------------------------------------------------------------
// SPA フォールバック（/api 以外を index.html に）
// ------------------------------------------------------------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexHtmlPath = path.resolve(FRONTEND_PATH, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath, err => {
      if (err) {
        console.error('[SPA] sendFile error:', err);
        res.status(500).json({ ok: false, error: 'Failed to serve application' });
      }
    });
  } else {
    res.status(404).json({
      ok: false,
      error: 'Application not found',
      message: 'Frontend not built. Run: cd frontend && npm run build',
      path: req.path,
    });
  }
});

// ------------------------------------------------------------
// エラーハンドラ（最後）
// ------------------------------------------------------------
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(200).json({ ok: false, error: 'Internal server error' });
});

// ------------------------------------------------------------
// エクスポート
// ------------------------------------------------------------
export default app;
