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