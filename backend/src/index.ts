// src/index.ts
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeJsonAtomic } from './helpers/writeJsonAtomic.js';

const app = express();
app.use(express.json());

// __dirnameの定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- 静的配信（SPA）- APIルートより前に配置 ----
const FRONTEND_PATH =
  process.env.FRONTEND_PATH
    ? path.resolve(process.env.FRONTEND_PATH)
    : path.resolve(__dirname, '..', '..', 'frontend', 'dist');

console.log(`[CONFIG] FRONTEND_PATH resolved to: ${FRONTEND_PATH}`);
console.log(`[CONFIG] __dirname: ${__dirname}`);

if (existsSync(FRONTEND_PATH)) {
  app.use(express.static(FRONTEND_PATH, {
    index: ['index.html'],
    dotfiles: 'ignore',
    etag: false,
    lastModified: false,
    maxAge: 0
  }));
  console.log(`[STATIC] ✅ Frontend files served from: ${FRONTEND_PATH}`);
  
  // index.htmlの存在を確認
  const indexHtmlPath = path.join(FRONTEND_PATH, 'index.html');
  if (existsSync(indexHtmlPath)) {
    console.log(`[STATIC] ✅ index.html found at: ${indexHtmlPath}`);
  } else {
    console.error(`[STATIC] ❌ index.html NOT FOUND at: ${indexHtmlPath}`);
  }
} else {
  console.error(`[STATIC] ❌ FRONTEND_PATH does not exist: ${FRONTEND_PATH}`);
  console.error(`[STATIC] ❌ Please build the frontend first: cd frontend && npm run build`);
}

// ---- 基本ヘルス ----
app.get('/__ping', (_req, res) => res.type('text/plain').send('pong'));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// 管理者用ヘルスチェック
app.get('/api/admin/health', (_req, res) => {
  try {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(200).json({
      ok: false,
      status: 'unhealthy',
      error: String(error)
    });
  }
});

// 管理者API基本エンドポイント
app.get('/api/admin', (req, res) => {
  try {
    console.log(`[API] GET /api/admin - ${req.ip} - ${new Date().toISOString()}`);
    res.status(200).json({ 
      message: 'Admin endpoint is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: [
        'GET /api/admin/health - ヘルスチェック',
        'GET /api/admin/departments - 部署一覧',
        'POST /api/admin/departments - 部署作成',
        'GET /api/admin/employees - 社員一覧',
        'POST /api/admin/employees - 社員作成',
        'GET /api/admin/master - マスターデータ',
        'GET /api/admin/attendance - 勤怠データ'
      ]
    });
  } catch (error) {
    console.error('[API ERROR] /api/admin:', error);
    res.status(200).json({
      ok: false,
      error: 'Internal server error',
      message: 'Admin endpoint error occurred'
    });
  }
});

// セッション管理API
const sessions = new Map<string, { user: any; createdAt: Date; expiresAt: Date }>();

// セッション保存
app.post('/api/admin/sessions', (req, res) => {
  try {
    const { code, name, department, rememberMe } = req.body;
    
    if (!code || !name) {
      return res.status(200).json({
        ok: false,
        error: 'ユーザー情報が不完全です'
      });
    }
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)); // 30日または1日
    
    const user = { code, name, department };
    sessions.set(sessionId, { user, createdAt: now, expiresAt });
    
    res.json({
      ok: true,
      sessionId,
      user,
      message: 'セッションが保存されました'
    });
  } catch (error) {
    console.error('セッション保存エラー:', error);
    res.status(200).json({
      ok: false,
      error: 'セッション保存に失敗しました'
    });
  }
});

// セッション取得
app.get('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(200).json({
        ok: false,
        error: 'セッションが見つかりません'
      });
    }
    
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(200).json({
        ok: false,
        error: 'セッションが期限切れです'
      });
    }
    
    res.json({
      ok: true,
      user: session.user,
      message: 'セッションが取得されました'
    });
  } catch (error) {
    console.error('セッション取得エラー:', error);
    res.status(200).json({
      ok: false,
      error: 'セッション取得に失敗しました'
    });
  }
});

// セッション削除
app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = sessions.delete(sessionId);
    
    res.json({
      ok: true,
      message: deleted ? 'セッションが削除されました' : 'セッションが見つかりませんでした'
    });
  } catch (error) {
    console.error('セッション削除エラー:', error);
    res.status(200).json({
      ok: false,
      error: 'セッション削除に失敗しました'
    });
  }
});

// ---- ここから互換ミニ版：データ読み取りだけ実装 ----

const DATA_DIR = path.join(__dirname, '..', 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');
const HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');

function safeReadJSON(filePath: string, defaultValue: any) {
  try {
    if (!existsSync(filePath)) return defaultValue;
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

const employees: any[] = safeReadJSON(EMPLOYEES_FILE, []);
const departments: any[] = safeReadJSON(DEPARTMENTS_FILE, []);
const attendanceData: Record<string, any> = safeReadJSON(ATTENDANCE_FILE, {});
const remarksData: Record<string, string> = safeReadJSON(REMARKS_FILE, {});
const holidays: Record<string, string> = safeReadJSON(HOLIDAYS_FILE, {});

const deptIndex = new Map<number, any>(departments.map(d => [d.id, d]));

function today(): string { return new Date().toISOString().slice(0, 10); }

// --- 主要API（読み取り専用）---

// 部署一覧
app.get('/api/admin/departments', (_req, res) => {
  try {
    res.json({ ok: true, departments });
  } catch (error) {
    console.error('Departments API error:', error);
    res.status(200).json({ ok: false, error: 'Failed to fetch departments' });
  }
});

// 部署作成
app.post('/api/admin/departments', (req, res) => {
  console.log('[API] POST /api/admin/departments called with body:', req.body);
  console.log('[API] Request headers:', req.headers);
  
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.log('[API] Validation failed: name is required');
      return res.status(200).json({ 
        ok: false, 
        error: '部署名は必須です' 
      });
    }
    
    // 新しい部署IDを生成（既存の最大ID + 1）
    const maxId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) : 0;
    const newId = maxId + 1;
    
    // 重複チェック
    const existingDept = departments.find(d => d.name === name.trim());
    if (existingDept) {
      console.log('Validation failed: department already exists');
      return res.status(200).json({ 
        ok: false, 
        error: '同じ名前の部署が既に存在します' 
      });
    }
    
    // 新しい部署を作成
    const newDepartment = {
      id: newId,
      name: name.trim()
    };
    
    departments.push(newDepartment);
    deptIndex.set(newId, newDepartment);
    
    // ファイルに保存
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    console.log('[API] Department created successfully:', newDepartment);
    res.status(200).json({ 
      ok: true, 
      department: newDepartment,
      message: '部署が作成されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Department creation error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '部署の作成に失敗しました',
      timestamp: new Date().toISOString()
    });
  }
});

// 部署更新
app.put('/api/admin/departments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const departmentId = parseInt(id);
    
    if (isNaN(departmentId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '無効な部署IDです' 
      });
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(200).json({ 
        ok: false, 
        error: '部署名は必須です' 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '部署が見つかりません' 
      });
    }
    
    // 重複チェック（自分以外）
    const existingDept = departments.find(d => d.name === name.trim() && d.id !== departmentId);
    if (existingDept) {
      return res.status(200).json({ 
        ok: false, 
        error: '同じ名前の部署が既に存在します' 
      });
    }
    
    // 部署を更新
    departments[departmentIndex].name = name.trim();
    deptIndex.set(departmentId, departments[departmentIndex]);
    
    // ファイルに保存
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    res.json({ 
      ok: true, 
      department: departments[departmentIndex],
      message: '部署が更新されました' 
    });
  } catch (error) {
    console.error('Department update error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '部署の更新に失敗しました' 
    });
  }
});

// 部署削除
app.delete('/api/admin/departments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = parseInt(id);
    
    if (isNaN(departmentId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '無効な部署IDです' 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '部署が見つかりません' 
      });
    }
    
    // 社員がこの部署に所属しているかチェック
    const employeesInDept = employees.filter(e => e.department_id === departmentId);
    if (employeesInDept.length > 0) {
      return res.status(200).json({ 
        ok: false, 
        error: `この部署には${employeesInDept.length}名の社員が所属しています。先に社員の部署を変更してください。` 
      });
    }
    
    // 部署を削除
    departments.splice(departmentIndex, 1);
    deptIndex.delete(departmentId);
    
    // ファイルに保存
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    res.json({ 
      ok: true, 
      message: '部署が削除されました' 
    });
  } catch (error) {
    console.error('Department deletion error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '部署の削除に失敗しました' 
    });
  }
});

// 社員一覧（dept名の解決を含む）
app.get('/api/admin/employees', (_req, res) => {
  const list = employees.map(e => {
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '未所属')
      : (e.dept ?? '未所属');
    return { ...e, dept };
  });
  res.json({ ok: true, employees: list });
});

// 社員作成
app.post('/api/admin/employees', (req, res) => {
  try {
    const { code, name, department_id } = req.body;
    
    if (!code || !name) {
      return res.status(200).json({ 
        ok: false, 
        error: '社員コードと名前は必須です' 
      });
    }
    
    // 重複チェック
    const existingEmployee = employees.find(e => e.code === code);
    if (existingEmployee) {
      return res.status(200).json({ 
        ok: false, 
        error: '同じ社員コードの社員が既に存在します' 
      });
    }
    
    // 部署IDの検証
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(200).json({ 
        ok: false, 
        error: '指定された部署が存在しません' 
      });
    }
    
    // 新しい社員を作成
    const newEmployee = {
      id: employees.length + 1,
      code: code.trim(),
      name: name.trim(),
      department_id: department_id || null,
      dept: department_id ? deptIndex.get(department_id)?.name : null
    };
    
    employees.push(newEmployee);
    
    // ファイルに保存
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.status(200).json({ 
      ok: true, 
      employee: newEmployee,
      message: '社員が作成されました' 
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '社員の作成に失敗しました' 
    });
  }
});

// 社員更新
app.put('/api/admin/employees/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { code: newCode, name, department_id } = req.body;
    
    if (!newCode || !name) {
      return res.status(200).json({ 
        ok: false, 
        error: '社員コードと名前は必須です' 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.code === code);
    if (employeeIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '社員が見つかりません' 
      });
    }
    
    // 部署IDの検証
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(200).json({ 
        ok: false, 
        error: '指定された部署が存在しません' 
      });
    }
    
    // 社員コードの重複チェック（自分以外）
    if (newCode !== code) {
      const existingEmployee = employees.find(e => e.code === newCode);
      if (existingEmployee) {
        return res.status(200).json({ 
          ok: false, 
          error: '同じ社員コードの社員が既に存在します' 
        });
      }
    }
    
    // 社員を更新
    employees[employeeIndex] = {
      ...employees[employeeIndex],
      code: newCode.trim(),
      name: name.trim(),
      department_id: department_id || null,
      dept: department_id ? deptIndex.get(department_id)?.name : null
    };
    
    // ファイルに保存
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.json({ 
      ok: true, 
      employee: employees[employeeIndex],
      message: '社員が更新されました' 
    });
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '社員の更新に失敗しました' 
    });
  }
});

// 社員削除
app.delete('/api/admin/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = parseInt(id);
    
    if (isNaN(employeeId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '無効な社員IDです' 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '社員が見つかりません' 
      });
    }
    
    // 勤怠データがあるかチェック
    const hasAttendance = Object.values(attendanceData).some(dayData => 
      Object.values(dayData).some((empData: any) => empData.code === employees[employeeIndex].code)
    );
    
    if (hasAttendance) {
      return res.status(200).json({ 
        ok: false, 
        error: 'この社員には勤怠データが存在します。先に勤怠データを削除してください。' 
      });
    }
    
    // 社員を削除
    employees.splice(employeeIndex, 1);
    
    // ファイルに保存
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.json({ 
      ok: true, 
      message: '社員が削除されました' 
    });
  } catch (error) {
    console.error('Employee deletion error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '社員の削除に失敗しました' 
    });
  }
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
      checkin: at.checkin || at.clock_in,
      checkout: at.checkout || at.clock_out,
      work_hours: at.work_hours || 0,
      work_minutes: at.work_minutes || 0,
      total_minutes: at.total_minutes || 0,
      late: at.late || 0,
      remark: at.remark || ''
    };
  });
  res.json({ ok: true, data: list, departments });
});

// 勤怠一覧（指定日）
app.get('/api/admin/attendance', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const list = employees.map(e => {
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
      checkin: at.checkin || at.clock_in,
      checkout: at.checkout || at.clock_out,
      work_hours: at.work_hours || 0,
      work_minutes: at.work_minutes || 0,
      total_minutes: at.total_minutes || 0,
      late: at.late || 0,
      remark: at.remark || ''
    };
  });
  res.json({ ok: true, data: list });
});

// 出勤打刻（管理用）
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { code, note } = req.body;
    if (!code) {
      return res.status(200).json({ ok: false, error: '社員コードが必要です' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (existing.checkin) {
      return res.status(200).json({ 
        ok: false, 
        error: '既に出勤打刻済みです' 
      });
    }

    const now = new Date();
    const checkinTime = now.toISOString();

    attendanceData[key] = {
      ...existing,
      code,
      checkin: checkinTime,
      note: note || null
    };

    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);

    res.json({
      ok: true,
      message: '出勤打刻が完了しました',
      checkin: checkinTime
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(200).json({ ok: false, error: '出勤打刻に失敗しました' });
  }
});

// 退勤打刻（管理用）
app.post('/api/attendance/checkout', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(200).json({ ok: false, error: '社員コードが必要です' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (!existing.checkin) {
      return res.status(200).json({ 
        ok: false, 
        error: '出勤打刻がされていません' 
      });
    }

    if (existing.checkout) {
      return res.status(200).json({ 
        ok: false, 
        error: '既に退勤打刻済みです' 
      });
    }

    const now = new Date();
    const checkoutTime = now.toISOString();
    
    // 出勤時間との差を計算
    const checkinTime = new Date(existing.checkin);
    const workMinutes = Math.floor((now.getTime() - checkinTime.getTime()) / (1000 * 60));
    const workHours = Math.floor(workMinutes / 60);
    const remainingMinutes = workMinutes % 60;

    attendanceData[key] = {
      ...existing,
      checkout: checkoutTime,
      work_hours: workHours,
      work_minutes: remainingMinutes,
      total_minutes: workMinutes
    };

    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);

    res.json({
      ok: true,
      message: '退勤打刻が完了しました',
      checkout: checkoutTime,
      work_hours: workHours,
      work_minutes: remainingMinutes,
      total_minutes: workMinutes
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(200).json({ ok: false, error: '退勤打刻に失敗しました' });
  }
});

// 備考取得
app.get('/api/admin/remarks/:employeeCode/:date', (req, res) => {
  const key = `${req.params.date}-${req.params.employeeCode}`;
  res.json({ ok: true, remark: remarksData[key] || '' });
});

// 備考保存
app.post('/api/admin/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body || {};
  if (!employeeCode || !date) return res.status(200).json({ ok: false, error: 'employeeCode and date required' });
  const key = `${date}-${employeeCode}`;
  remarksData[key] = String(remark || '');
  writeJsonAtomic(REMARKS_FILE, remarksData);
  res.json({ ok: true });
});

// 出勤打刻
app.post('/api/public/clock-in', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(200).json({ ok: false, error: 'code required' });
  const emp = employees.find(e => e.code === code);
  if (!emp) return res.status(200).json({ ok: false, error: 'Employee not found' });

  const key = `${today()}-${code}`;
  const rec = attendanceData[key] || {};
  if (rec.clock_in) return res.json({ ok: true, idempotent: true, time: rec.clock_in });

  const now = new Date();
  const start = new Date(now); start.setHours(10, 0, 0, 0);
  const late = now > start ? Math.floor((+now - +start) / 60000) : 0;
  attendanceData[key] = { ...rec, clock_in: now.toISOString(), late };
  writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
  res.json({ ok: true, late });
});

// 退勤打刻
app.post('/api/public/clock-out', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(200).json({ ok: false, error: 'code required' });
  const emp = employees.find(e => e.code === code);
  if (!emp) return res.status(200).json({ ok: false, error: 'Employee not found' });

  const key = `${today()}-${code}`;
  const rec = attendanceData[key];
  if (!rec?.clock_in) return res.status(200).json({ ok: false, error: 'No clock-in' });
  if (rec.clock_out) return res.json({ ok: true, idempotent: true, time: rec.clock_out });

  const now = new Date();
  const workMinutes = Math.floor((+now - +new Date(rec.clock_in)) / 60000);
  attendanceData[key] = { ...rec, clock_out: now.toISOString(), work_minutes: workMinutes };
  writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
  res.json({ ok: true, work_minutes: workMinutes });
});

// 祝日管理API
app.get('/api/admin/holidays', (_req, res) => {
  try {
    res.json({ 
      ok: true, 
      holidays: holidays 
    });
  } catch (error) {
    console.error('Holidays API error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '祝日データの取得に失敗しました' 
    });
  }
});

app.get('/api/admin/holidays/:date', (req, res) => {
  try {
    const { date } = req.params;
    const isHoliday = holidays[date] !== undefined;
    
    res.json({ 
      ok: true, 
      date,
      isHoliday,
      holidayName: holidays[date] || null
    });
  } catch (error) {
    console.error('Holiday check error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '祝日チェックに失敗しました' 
    });
  }
});

// 週次レポートAPI
app.get('/api/admin/weekly', (req, res) => {
    try {
      const { start } = req.query;
      const startDate = start ? new Date(start as string) : new Date();
      
      // 週の開始日（月曜日）を計算
      const dayOfWeek = startDate.getDay();
      const monday = new Date(startDate);
      monday.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      
      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        
        const dayAttendance = attendanceData[dateStr] || {};
        const dayEmployees = Object.values(dayAttendance);
        
        const summary = {
          date: dateStr,
          totalEmployees: employees.length,
          presentEmployees: dayEmployees.length,
          lateEmployees: dayEmployees.filter((emp: any) => emp.late > 0).length,
          absentEmployees: employees.length - dayEmployees.length
        };
        
        weekData.push(summary);
      }
      
      res.json({ 
        ok: true, 
        weekData,
        startDate: monday.toISOString().slice(0, 10)
      });
    } catch (error) {
      console.error('Weekly report error:', error);
      res.status(200).json({ 
        ok: false, 
        error: '週次レポートの取得に失敗しました' 
      });
    }
  });

  // 月別備考取得API
  app.get('/api/admin/remarks/:employeeCode', (req, res) => {
    try {
      const { employeeCode } = req.params;
      const { month } = req.query;
      
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM形式
      const remarks = [];
      
      // 指定月の備考を取得
      for (const [date, dayData] of Object.entries(attendanceData)) {
        if (date.startsWith(targetMonth as string)) {
          for (const [empCode, empData] of Object.entries(dayData)) {
            if (empCode === employeeCode && (empData as any).remark) {
              remarks.push({
                date,
                remark: (empData as any).remark
              });
            }
          }
        }
      }
      
      res.json({ 
        ok: true, 
        employeeCode,
        month: targetMonth,
        remarks
      });
    } catch (error) {
      console.error('Monthly remarks error:', error);
      res.status(200).json({ 
        ok: false, 
        error: '月別備考の取得に失敗しました' 
      });
    }
  });

  // SPAのルーティング：/api 以外は index.html
app.get('*', (req, res) => {
  // APIルートは既に上で定義済みなので、ここでは処理しない
  const indexHtmlPath = path.resolve(FRONTEND_PATH, 'index.html');
  
  // index.htmlの存在を確認
  if (existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath, (err) => {
      if (err) {
        console.error(`[SPA FALLBACK] Error sending index.html for ${req.path}:`, err);
        res.status(500).json({
          error: 'Failed to serve application',
          message: 'Internal server error',
          path: req.path
        });
      }
    });
  } else {
    console.error(`[SPA FALLBACK] index.html not found at: ${indexHtmlPath}`);
    res.status(404).json({
      error: 'Application not found',
      message: 'Frontend application is not built. Please run: cd frontend && npm run build',
      path: req.path
    });
  }
});

// ---- 起動 ----
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8001; // 環境変数から読み込み、デフォルトは8001

const server = app.listen(PORT, HOST, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
});

// グローバルエラーハンドラー
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(200).json({
    ok: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404ハンドラー
app.use('*', (req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl} - ${req.ip}`);
  res.status(200).json({
    ok: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

export default app;
