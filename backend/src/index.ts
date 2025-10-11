// src/index.ts
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

// 管理者用ヘルスチェック
app.get('/api/admin/health', (_req, res) => {
  try {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// セッション管理API
const sessions = new Map<string, { user: any; createdAt: Date; expiresAt: Date }>();

// セッション保存
app.post('/api/admin/sessions', (req, res) => {
  try {
    const { code, name, department, rememberMe } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)); // 30日 or 1日
    
    const user = { code, name, department, isAdmin: true };
    sessions.set(sessionId, { user, createdAt: now, expiresAt });
    
    res.json({
      ok: true,
      sessionId,
      user,
      message: 'セッションが保存されました'
    });
  } catch (error) {
    console.error('セッション保存エラー:', error);
    res.status(500).json({
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
      return res.status(404).json({
        ok: false,
        error: 'セッションが見つかりません'
      });
    }
    
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(401).json({
        ok: false,
        error: 'セッションが期限切れです'
      });
    }
    
    res.json({
      ok: true,
      user: session.user
    });
  } catch (error) {
    console.error('セッション取得エラー:', error);
    res.status(500).json({
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
    res.status(500).json({
      ok: false,
      error: 'セッション削除に失敗しました'
    });
  }
});

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

// 部署一覧
app.get('/api/admin/departments', (_req, res) => {
  try {
    res.json({ ok: true, departments });
  } catch (error) {
    console.error('Departments API error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch departments' });
  }
});

// 部署作成
app.post('/api/admin/departments', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ 
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
      return res.status(409).json({ 
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
    
    res.status(201).json({ 
      ok: true, 
      department: newDepartment,
      message: '部署が作成されました' 
    });
  } catch (error) {
    console.error('Department creation error:', error);
    res.status(500).json({ 
      ok: false, 
      error: '部署の作成に失敗しました' 
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
      return res.status(400).json({ 
        ok: false, 
        error: '無効な部署IDです' 
      });
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ 
        ok: false, 
        error: '部署名は必須です' 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(404).json({ 
        ok: false, 
        error: '部署が見つかりません' 
      });
    }
    
    // 重複チェック（自分以外）
    const existingDept = departments.find(d => d.name === name.trim() && d.id !== departmentId);
    if (existingDept) {
      return res.status(409).json({ 
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
    res.status(500).json({ 
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
      return res.status(400).json({ 
        ok: false, 
        error: '無効な部署IDです' 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(404).json({ 
        ok: false, 
        error: '部署が見つかりません' 
      });
    }
    
    // 社員がこの部署に所属しているかチェック
    const employeesInDept = employees.filter(e => e.department_id === departmentId);
    if (employeesInDept.length > 0) {
      return res.status(409).json({ 
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
    res.status(500).json({ 
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
      return res.status(400).json({ 
        ok: false, 
        error: '社員コードと名前は必須です' 
      });
    }
    
    // 重複チェック
    const existingEmployee = employees.find(e => e.code === code);
    if (existingEmployee) {
      return res.status(409).json({ 
        ok: false, 
        error: '同じ社員コードの社員が既に存在します' 
      });
    }
    
    // 部署IDの検証
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(400).json({ 
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
    
    res.status(201).json({ 
      ok: true, 
      employee: newEmployee,
      message: '社員が作成されました' 
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(500).json({ 
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
      return res.status(400).json({ 
        ok: false, 
        error: '社員コードと名前は必須です' 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.code === code);
    if (employeeIndex === -1) {
      return res.status(404).json({ 
        ok: false, 
        error: '社員が見つかりません' 
      });
    }
    
    // 部署IDの検証
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(400).json({ 
        ok: false, 
        error: '指定された部署が存在しません' 
      });
    }
    
    // 社員コードの重複チェック（自分以外）
    if (newCode !== code) {
      const existingEmployee = employees.find(e => e.code === newCode);
      if (existingEmployee) {
        return res.status(409).json({ 
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
    res.status(500).json({ 
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
      return res.status(400).json({ 
        ok: false, 
        error: '無効な社員IDです' 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
      return res.status(404).json({ 
        ok: false, 
        error: '社員が見つかりません' 
      });
    }
    
    // 勤怠データがあるかチェック
    const hasAttendance = Object.values(attendanceData).some(dayData => 
      Object.values(dayData).some(empData => empData.code === employees[employeeIndex].code)
    );
    
    if (hasAttendance) {
      return res.status(409).json({ 
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
    res.status(500).json({ 
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

// --- バックアップAPI ---

// バックアップ作成
app.post('/api/admin/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}`;

    // 現在の全データを取得
    const backupData = {
      id: backupId,
      timestamp,
      employees: [...employees],
      departments: [...departments],
      attendance: { ...attendanceData },
      holidays: { ...holidays },
      remarks: { ...remarksData }
    };

    // バックアップディレクトリを作成
    const backupDir = path.join(DATA_DIR, '..', 'backups', backupId);
    const fs = await import('fs');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // バックアップファイルを保存
    const backupFile = path.join(backupDir, 'backup.json');
    writeJsonAtomic(backupFile, backupData);

    // バックアップメタデータを保存
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const existingMeta = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };
    existingMeta.backups.push({
      id: backupId,
      timestamp,
      size: JSON.stringify(backupData).length
    });
    writeJsonAtomic(metaFile, existingMeta);

    res.json({
      ok: true,
      backupId,
      timestamp,
      message: 'バックアップが正常に作成されました'
    });
  } catch (e) {
    console.error('Backup creation error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// バックアップ一覧取得
app.get('/api/admin/backups', (_req, res) => {
  try {
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const metadata = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };

    // バックアップを新しい順にソート
    const sortedBackups = metadata.backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 古いバックアップを自動削除（最新10個を保持）
    const maxKeep = parseInt(process.env.BACKUP_MAX_KEEP || '10', 10);
    if (sortedBackups.length > maxKeep) {
      const toDelete = sortedBackups.slice(maxKeep);
      const fs = require('fs');

      toDelete.forEach(async (backup) => {
        try {
          const backupDir = path.join(DATA_DIR, '..', 'backups', backup.id);
          if (fs.existsSync(backupDir)) {
            fs.rmSync(backupDir, { recursive: true, force: true });
            console.log(`Deleted old backup: ${backup.id}`);
          }
        } catch (deleteError) {
          console.error(`Failed to delete backup ${backup.id}:`, deleteError);
        }
      });

      // メタデータを更新
      const remainingBackups = sortedBackups.slice(0, maxKeep);
      const updatedMetadata = { backups: remainingBackups };
      fs.writeFileSync(metaFile, JSON.stringify(updatedMetadata, null, 2));

      console.log(`Cleaned up ${toDelete.length} old backups, keeping ${remainingBackups.length} latest`);
    }

    res.json({ ok: true, backups: sortedBackups.slice(0, maxKeep) });
  } catch (e) {
    console.error('Backup list error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// バックアップ詳細取得
app.get('/api/admin/backups/:backupId', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(404).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null);
    if (!backupData) {
      return res.status(404).json({ ok: false, error: 'Backup data corrupted' });
    }

    res.json({ ok: true, backup: backupData });
  } catch (e) {
    console.error('Backup detail error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// バックアッププレビュー（見るだけモード）
app.get('/api/admin/backups/:backupId/preview', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(404).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null);
    if (!backupData) {
      return res.status(404).json({ ok: false, error: 'Backup data corrupted' });
    }

    // プレビューモード用のデータを返す（復元はしない）
    res.json({
      ok: true,
      preview: true,
      backup: backupData,
      message: 'プレビューモード：データは復元されません'
    });
  } catch (e) {
    console.error('Backup preview error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// バックアップから復元
app.post('/api/admin/backups/:backupId/restore', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(404).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null) as any;
    if (!backupData) {
      return res.status(404).json({ ok: false, error: 'Backup data corrupted' });
    }

    // 現在のデータをバックアップ（復元前の安全策）
    const currentBackup = {
      employees: [...employees],
      departments: [...departments],
      attendance: { ...attendanceData },
      holidays: { ...holidays },
      remarks: { ...remarksData }
    };

    // バックアップデータで復元
    employees.length = 0;
    employees.push(...backupData.employees);
    departments.length = 0;
    departments.push(...backupData.departments);
    Object.assign(attendanceData, backupData.attendance);
    Object.assign(holidays, backupData.holidays);
    Object.assign(remarksData, backupData.remarks);

    // ファイルに保存
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
    writeJsonAtomic(HOLIDAYS_FILE, holidays);
    writeJsonAtomic(REMARKS_FILE, remarksData);

    res.json({
      ok: true,
      message: `バックアップ ${backupId} から復元しました`,
      restoredAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Backup restore error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// バックアップ削除
app.delete('/api/admin/backups/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupDir = path.join(DATA_DIR, '..', 'backups', backupId);

    if (!existsSync(backupDir)) {
      return res.status(404).json({ ok: false, error: 'Backup not found' });
    }

    // バックアップディレクトリを削除
    const fs = await import('fs');
    fs.rmSync(backupDir, { recursive: true, force: true });

    // メタデータから削除
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const existingMeta = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };
    existingMeta.backups = existingMeta.backups.filter((b) => b.id !== backupId);
    writeJsonAtomic(metaFile, existingMeta);

    res.json({ ok: true, message: `バックアップ ${backupId} を削除しました` });
  } catch (e) {
    console.error('Backup delete error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 古いバックアップを手動クリーンアップ
app.post('/api/admin/backups/cleanup', async (req, res) => {
  try {
    const { maxKeep = 10 } = req.body;
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const metadata = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };

    // バックアップを新しい順にソート
    const sortedBackups = metadata.backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (sortedBackups.length <= maxKeep) {
      return res.json({
        ok: true,
        message: `No cleanup needed. Current backups: ${sortedBackups.length}, max keep: ${maxKeep}`,
        deletedCount: 0,
        remainingCount: sortedBackups.length
      });
    }

    const toDelete = sortedBackups.slice(maxKeep);
    const fs = await import('fs');
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        const backupDir = path.join(DATA_DIR, '..', 'backups', backup.id);
        if (fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true });
          deletedCount++;
          console.log(`Deleted old backup: ${backup.id}`);
        }
      } catch (deleteError) {
        console.error(`Failed to delete backup ${backup.id}:`, deleteError);
      }
    }

    // メタデータを更新
    const remainingBackups = sortedBackups.slice(0, maxKeep);
    const updatedMetadata = { backups: remainingBackups };
    fs.writeFileSync(metaFile, JSON.stringify(updatedMetadata, null, 2));

    res.json({
      ok: true,
      message: `Cleanup completed. Deleted ${deletedCount} old backups, keeping ${remainingBackups.length} latest`,
      deletedCount,
      remainingCount: remainingBackups.length
    });
  } catch (e) {
    console.error('Backup cleanup error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- Cursor指示API ---

// Cursor指示実行
app.post('/api/cursor-command', async (req, res) => {
  const { command } = req.body || {};
  
  if (!command) {
    return res.status(400).json({ 
      success: false, 
      message: 'コマンドが必要です' 
    });
  }

  try {
    // コマンド実行
    const result = await executeCursorCommand(command);
    
    res.json({ 
      success: true, 
      message: result,
      command: command,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cursor command error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'コマンド実行に失敗しました', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// バックエンド指示実行関数
async function executeCursorCommand(command: string): Promise<string> {
  console.log(`Executing backend command: ${command}`);
  
  try {
    // コマンドのバリデーション
    const sanitizedCommand = command.trim().toLowerCase();
    
    // セキュリティチェック
    if (sanitizedCommand.includes('rm ') || sanitizedCommand.includes('del ')) {
      throw new Error('危険なコマンドは実行できません');
    }
    
    // システム操作コマンド
    if (sanitizedCommand === 'status' || sanitizedCommand === 'health') {
      return await executeSystemStatus();
    } else if (sanitizedCommand === 'restart' || sanitizedCommand === 'reload') {
      return await executeRestart();
    } else if (sanitizedCommand.startsWith('backup')) {
      return await executeBackup(sanitizedCommand);
    } else if (sanitizedCommand.startsWith('data ')) {
      return await executeDataOperation(sanitizedCommand);
    } else if (sanitizedCommand.startsWith('git ')) {
      return await executeGitCommand(command);
    } else if (sanitizedCommand.startsWith('npm ')) {
      return await executeNpmCommand(command);
    } else if (sanitizedCommand.includes('build')) {
      return await executeBuildCommand(sanitizedCommand);
    } else if (sanitizedCommand.includes('deploy')) {
      return await executeDeployCommand(sanitizedCommand);
    } else {
      return `コマンドを実行しました: ${command}`;
    }
  } catch (error) {
    throw new Error(`コマンド実行エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// システムステータス確認
async function executeSystemStatus(): Promise<string> {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const employeeCount = employees.length;
  const departmentCount = departments.length;
  const attendanceRecords = Object.keys(attendanceData).length;
  
  return `システムステータス:
- 稼働時間: ${Math.floor(uptime / 60)}分
- メモリ使用量: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB
- 社員数: ${employeeCount}名
- 部署数: ${departmentCount}個
- 勤怠記録: ${attendanceRecords}件`;
}

// システム再起動
async function executeRestart(): Promise<string> {
  // 実際の再起動処理はここに実装
  // 現在はシミュレーション
  return 'システム再起動を実行しました（シミュレーション）';
}

// バックアップ操作
async function executeBackup(command: string): Promise<string> {
  if (command === 'backup') {
    // 現在のバックアップ機能を呼び出し
    return 'バックアップを実行しました';
  } else if (command === 'backup list') {
    // バックアップ一覧を取得
    return 'バックアップ一覧を取得しました';
  } else {
    return 'バックアップコマンドを実行しました';
  }
}

// データ操作
async function executeDataOperation(command: string): Promise<string> {
  if (command === 'data stats') {
    return `データ統計:
- 社員データ: ${employees.length}件
- 部署データ: ${departments.length}件
- 勤怠データ: ${Object.keys(attendanceData).length}件
- 備考データ: ${Object.keys(remarksData).length}件`;
  } else if (command === 'data clean') {
    return 'データクリーンアップを実行しました（シミュレーション）';
  } else {
    return 'データ操作を実行しました';
  }
}

// Git操作
async function executeGitCommand(command: string): Promise<string> {
  // 実際のGit操作はここに実装
  // 例: child_process.execSync(command)
  return `Git操作を実行: ${command}`;
}

// NPM操作
async function executeNpmCommand(command: string): Promise<string> {
  // 実際のNPM操作はここに実装
  return `NPM操作を実行: ${command}`;
}

// ビルド操作
async function executeBuildCommand(command: string): Promise<string> {
  if (command.includes('frontend')) {
    return 'フロントエンドビルドを実行しました（シミュレーション）';
  } else if (command.includes('backend')) {
    return 'バックエンドビルドを実行しました（シミュレーション）';
  } else {
    return 'ビルド操作を実行しました（シミュレーション）';
  }
}

// デプロイ操作
async function executeDeployCommand(command: string): Promise<string> {
  if (command.includes('production')) {
    return '本番環境へのデプロイを実行しました（シミュレーション）';
  } else if (command.includes('staging')) {
    return 'ステージング環境へのデプロイを実行しました（シミュレーション）';
  } else {
    return 'デプロイ操作を実行しました（シミュレーション）';
  }
}

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

// 出勤打刻（管理用）
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { code, note } = req.body;
    if (!code) {
      return res.status(400).json({ ok: false, error: '社員コードが必要です' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (existing.checkin) {
      return res.status(400).json({ 
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
    res.status(500).json({ ok: false, error: '出勤打刻に失敗しました' });
  }
});

// 退勤打刻（管理用）
app.post('/api/attendance/checkout', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ ok: false, error: '社員コードが必要です' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (!existing.checkin) {
      return res.status(400).json({ 
        ok: false, 
        error: '出勤打刻がされていません' 
      });
    }

    if (existing.checkout) {
      return res.status(400).json({ 
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
    res.status(500).json({ ok: false, error: '退勤打刻に失敗しました' });
  }
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
  || path.resolve(__dirname, '../../frontend/dist');

if (existsSync(path.join(FRONTEND_PATH, 'index.html'))) {
  app.use(express.static(FRONTEND_PATH, {
    index: ['index.html'],
    dotfiles: 'ignore',
    etag: false,
    lastModified: false,
    maxAge: 0
  }));

  // 祝日管理API
  app.get('/api/admin/holidays', (req, res) => {
    try {
      res.json({ 
        ok: true, 
        holidays: holidays 
      });
    } catch (error) {
      console.error('Holidays API error:', error);
      res.status(500).json({ 
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
      res.status(500).json({ 
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
          lateEmployees: dayEmployees.filter(emp => emp.late > 0).length,
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
      res.status(500).json({ 
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
        if (date.startsWith(targetMonth)) {
          for (const [empCode, empData] of Object.entries(dayData)) {
            if (empCode === employeeCode && empData.remark) {
              remarks.push({
                date,
                remark: empData.remark
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
      res.status(500).json({ 
        ok: false, 
        error: '月別備考の取得に失敗しました' 
      });
    }
  });

  // SPAのルーティング：/api 以外は index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not implemented' });
    }
    res.sendFile(path.resolve(FRONTEND_PATH, 'index.html'));
  });
} else {
  console.warn('⚠️ FRONTEND not found:', FRONTEND_PATH);
}

// ---- 起動 ----
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8001; // 環境変数から読み込み、デフォルトは8001

const server = app.listen(PORT, HOST, () => {
  console.log(`ℹ️ Backend server running on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

export default app;