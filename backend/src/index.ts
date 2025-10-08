import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync, statSync, cpSync } from 'fs';
import { createHash } from 'crypto';

// ログレベル設定
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDebugMode = LOG_LEVEL === 'debug';
const isProduction = process.env.NODE_ENV === 'production';

// ログ関数（本番環境では必要最小限のログのみ出力）
const logger = {
  info: (message: string, ...args: any[]) => {
    if (!isProduction || LOG_LEVEL === 'info') {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (isDebugMode && !isProduction) {
      console.log(`🐛 ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (!isProduction || LOG_LEVEL === 'warn' || LOG_LEVEL === 'info') {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // エラーログは常に出力
    console.error(`❌ ${message}`, ...args);
  }
};

// ES moduleで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// CORS設定を環境変数から動的に設定
app.use((req, res, next) => {
  // 環境変数から許可されたオリジンを取得
  const corsOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOrigin 
    ? corsOrigin.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:8000', 
        'http://127.0.0.1:8000'
      ];
  
  const origin = req.headers.origin;
  
  // 同一オリジン（originがnull）または許可されたオリジンの場合
  if (!origin || allowedOrigins.includes(origin as string)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});
app.use(express.json());

// リクエストログを追加
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`📡 ${new Date().toISOString()} ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin']
    }
  });
  
  // レスポンスログを追加
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };
  
  next();
});

// 静的ファイル配信（フロントエンド）
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend/dist');
// 静的ファイルが存在するかチェック
let staticFilesEnabled = false;
if (existsSync(frontendPath)) {
  const indexPath = path.join(frontendPath, 'index.html');
  if (existsSync(indexPath)) {
    // 静的ファイル配信を設定（APIルートより前に配置）
    app.use(express.static(frontendPath, {
      index: ['index.html'], // index.htmlを自動配信
      dotfiles: 'ignore',
      etag: false, // ETagを無効化
      lastModified: false, // Last-Modifiedを無効化
      maxAge: 0 // キャッシュを無効化
    }));
    
    // キャッシュ無効化ヘッダーを追加
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      next();
    });
    staticFilesEnabled = true;
    logger.info(`Static files enabled from: ${frontendPath}`);
  } else {
    logger.warn(`index.html not found at: ${indexPath}`);
  }
} else {
  logger.warn(`Static files directory not found at: ${frontendPath}`);
  logger.warn(`Set FRONTEND_PATH environment variable to specify custom path`);
}

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// デバッグ用エンドポイントは本番環境でセキュリティリスクのため削除

// セッション管理用のデータストレージ（本番環境では外部ストレージ推奨）
const userSessions: {[sessionId: string]: {
  code: string;
  name: string;
  department: string;
  isAdmin: boolean;
  lastAccess: Date;
}} = {};

// セッションタイムアウト（24時間）
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

// 古いセッションをクリーンアップする関数
const cleanupExpiredSessions = () => {
  const now = new Date();
  Object.keys(userSessions).forEach(sessionId => {
    const session = userSessions[sessionId];
    if (now.getTime() - session.lastAccess.getTime() > SESSION_TIMEOUT) {
      logger.info(`セッションタイムアウト: ${session.name} (${session.code})`);
      delete userSessions[sessionId];
    }
  });
};

// 定期的にセッションクリーンアップ（1時間ごと）
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// セッション保存API
app.post('/api/admin/sessions', (req, res) => {
  const { code, name, rememberMe } = req.body as { code?: string; name?: string; rememberMe?: boolean };
  
  if (!code || !name) {
    return res.status(400).json({ error: 'Employee code and name are required' });
  }

  // 社員存在チェック（コードで特定、名前も一致を推奨）
  const employee = employees.find(e => e.code === code);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  // 名前不一致は弾く（要件に応じて緩和可）
  if (employee.name !== name) {
    return res.status(400).json({ error: 'Employee name does not match' });
  }

  // 部署名はdepartment_idから算出
  const department = employee.department_id ? departments.find(d => d.id === employee.department_id) : undefined;
  const departmentName = department?.name || employee.dept || '未所属';

  // セッションIDを生成
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 管理者権限判定
  const adminCodes = ['999'];
  const isAdmin = adminCodes.includes(code) || departmentName === '管理部';
  
  // セッション保存
  userSessions[sessionId] = {
    code,
    name,
    department: departmentName,
    isAdmin,
    lastAccess: new Date()
  };
  
  logger.info(`セッション保存: ${name} (${code}) - Dept: ${departmentName}`);
  
  res.json({
    ok: true,
    sessionId,
    user: {
      code,
      name,
      department: departmentName,
      isAdmin
    },
    rememberMe
  });
});

// セッション取得API
app.get('/api/admin/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = userSessions[sessionId];
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // 最終アクセス時刻を更新
  session.lastAccess = new Date();
  
  res.json({
    ok: true,
    user: {
      code: session.code,
      name: session.name,
      department: session.department,
      isAdmin: session.isAdmin
    }
  });
});

// セッション削除API
app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (userSessions[sessionId]) {
    logger.info(`セッション削除: ${userSessions[sessionId].name} (${userSessions[sessionId].code})`);
    delete userSessions[sessionId];
  }
  
  res.json({ ok: true });
});

// 祝日API
app.get('/api/admin/holidays', (_req, res) => {
  res.json({ 
    ok: true, 
    holidays: holidays,
    count: Object.keys(holidays).length 
  });
});

app.get('/api/admin/holidays/:date', (req, res) => {
  const { date } = req.params;
  const holidayName = getHolidayName(date);
  const weekend = isWeekend(date);
  const workingDay = isWorkingDay(date);
  
  res.json({
    ok: true,
    date: date,
    isHoliday: !!holidayName,
    holidayName: holidayName,
    isWeekend: weekend,
    isWorkingDay: workingDay,
    dayType: holidayName ? 'holiday' : weekend ? 'weekend' : 'workday'
  });
});

// データ永続化のためのファイルパス（環境変数対応）
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const REMARKS_FILE = path.join(DATA_DIR, 'remarks.json');
const PERSONAL_PAGES_FILE = path.join(DATA_DIR, 'personal_pages.json');

// データ保存・読み込み関数（強化版）
const saveData = (file: string, data: any) => {
  try {
    // ディレクトリが存在しない場合は作成
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
      logger.info(`データディレクトリ作成: ${DATA_DIR}`);
    }
    
    // バックアップファイルを作成
    const backupFile = file + '.backup';
    if (existsSync(file)) {
      const existingData = readFileSync(file, 'utf8');
      writeFileSync(backupFile, existingData);
    }
    
    // データを保存
    const jsonData = JSON.stringify(data, null, 2);
    writeFileSync(file, jsonData);
    
    // 保存を確認
    const savedData = readFileSync(file, 'utf8');
    if (savedData === jsonData) {
      logger.info(`✅ データ保存成功: ${path.basename(file)} (${Array.isArray(data) ? data.length : Object.keys(data).length}件)`);
    } else {
      logger.error(`❌ データ保存確認失敗: ${path.basename(file)}`);
      throw new Error('データ保存確認失敗');
    }
  } catch (error) {
    logger.error(`❌ データ保存エラー: ${path.basename(file)}`, error);
    throw error; // エラーを再スローして呼び出し元で処理
  }
};

const loadData = (file: string, defaultData: any) => {
  try {
    if (existsSync(file)) {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      logger.info(`データ読み込み: ${path.basename(file)} (${Array.isArray(data) ? data.length : Object.keys(data).length}件)`);
      return data;
    }
  } catch (error) {
    logger.error(`データ読み込みエラー: ${path.basename(file)}`, error);
    // ファイルが破損している場合は空データで初期化
    saveData(file, defaultData);
  }
  logger.info(`空データ作成: ${path.basename(file)}`);
  // ダミーデータは作成せず、空のデータを返す
  return Array.isArray(defaultData) ? [] : {};
};

// 部署管理API（永続化対応）
const departments: { id: number; name: string }[] = loadData(DEPARTMENTS_FILE, []);

// 部署データのインデックスを作成（パフォーマンス向上）
const departmentIndex = new Map<number, { id: number; name: string }>(); // id -> department

// インデックスを初期化
const initializeDepartmentIndex = () => {
  departmentIndex.clear();
  departments.forEach(dept => {
    departmentIndex.set(dept.id, dept);
  });
  logger.info(`📊 部署インデックス初期化完了: ${departments.length}部署`);
};

initializeDepartmentIndex();

app.get('/api/admin/departments', (_req, res) => {
  res.json({ list: departments });
});

app.post('/api/admin/departments', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  
  const newId = Math.max(...departments.map(d => d.id), 0) + 1;
  const newDepartment = { id: newId, name };
  departments.push(newDepartment);
  saveData(DEPARTMENTS_FILE, departments);
  
  // インデックスを更新
  departmentIndex.set(newId, newDepartment);
  
  res.json({ list: departments });
});

app.put('/api/admin/departments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  
  const department = departmentIndex.get(id);
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }
  
  department.name = name;
  saveData(DEPARTMENTS_FILE, departments);
  
  // インデックスを更新
  departmentIndex.set(id, department);
  
  res.json({ list: departments });
});

app.delete('/api/admin/departments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const department = departmentIndex.get(id);
  
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }
  
  const index = departments.findIndex(d => d.id === id);
  departments.splice(index, 1);
  
  // インデックスを更新
  departmentIndex.delete(id);
  
  // ファイルに保存
  saveData(DEPARTMENTS_FILE, departments);
  
  res.json({ list: departments });
});

// 社員管理API（永続化対応）
const employees: { id: number; code: string; name: string; department_id: number | null; dept: string }[] = loadData(EMPLOYEES_FILE, []);

// 社員データのインデックスを作成（パフォーマンス向上）
const employeeIndex = new Map<string, number>(); // code -> index
const employeeIdIndex = new Map<number, number>(); // id -> index

// インデックスを初期化
const initializeEmployeeIndexes = () => {
  employeeIndex.clear();
  employeeIdIndex.clear();
  employees.forEach((emp, index) => {
    employeeIndex.set(emp.code, index);
    employeeIdIndex.set(emp.id, index);
  });
  logger.info(`📊 社員インデックス初期化完了: ${employees.length}名`);
};

initializeEmployeeIndexes();

// 初期社員データは作成しない（ダミーデータ削除）

app.get('/api/admin/employees', (_req, res) => {
  // 部署名は常に部署テーブルから算出（emp.deptは信用しない）
  // インデックスを使用してパフォーマンスを向上
  const employeesWithDept = employees.map(emp => {
    const department = emp.department_id ? departmentIndex.get(emp.department_id) : undefined;
    const deptName = department?.name || '未所属';
    return { ...emp, dept: deptName };
  });
  
  res.json({ list: employeesWithDept });
});

app.post('/api/admin/employees', (req, res) => {
  const { code, name, department_id } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }
  
  const newId = Math.max(...employees.map(e => e.id), 0) + 1;
  let department = undefined as { id: number; name: string } | undefined;
  if (department_id !== undefined && department_id !== null) {
    department = departmentIndex.get(Number(department_id));
    if (!department) {
      return res.status(400).json({ error: 'Department not found' });
    }
  }
  const newEmployee = { 
    id: newId, 
    code, 
    name, 
    department_id: department ? department.id : null,
    dept: department?.name || '未所属'
  };
  employees.push(newEmployee);
  saveData(EMPLOYEES_FILE, employees);
  
  // インデックスを更新
  employeeIndex.set(newEmployee.code, employees.length - 1);
  employeeIdIndex.set(newEmployee.id, employees.length - 1);
  
  // 新規社員の個人ページ用勤怠データを初期化（今日と明日分を作成）
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // 今日の勤怠データを作成
  const todayKey = `${today}-${code}`;
  if (!attendanceData[todayKey]) {
    attendanceData[todayKey] = {
      clock_in: null,
      clock_out: null,
      late: 0,
      early: 0,
      overtime: 0,
      night: 0,
      work_minutes: 0
    };
  }
  
  // 明日の勤怠データも作成（翌日から使えるように）
  const tomorrowKey = `${tomorrow}-${code}`;
  if (!attendanceData[tomorrowKey]) {
    attendanceData[tomorrowKey] = {
      clock_in: null,
      clock_out: null,
      late: 0,
      early: 0,
      overtime: 0,
      night: 0,
      work_minutes: 0
    };
  }
  
  saveData(ATTENDANCE_FILE, attendanceData);
  logger.info(`✅ 新規社員のパーソナルページを作成: ${name} (${code}) - 今日と明日の勤怠データを初期化`);
  
  res.json({ list: employees });
});

// 重複エンドポイントを削除（IDベースのエンドポイントを使用）

app.delete('/api/admin/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = employeeIdIndex.get(id);
  
  if (index === undefined) {
    return res.status(404).json({ ok: false, error: 'Employee not found' });
  }
  
  const deletedEmployee = employees[index];
  employees.splice(index, 1);
  
  // インデックスを再構築（削除された要素のインデックスが変わったため）
  initializeEmployeeIndexes();
  
  // ファイルに保存
  try {
    saveData(EMPLOYEES_FILE, employees);
    logger.info(`社員削除: ${deletedEmployee.name} (ID: ${id})`);
    res.json({ ok: true, message: `社員を削除しました: ${deletedEmployee.name}`, list: employees });
  } catch (error) {
    console.error('❌ 社員削除ファイル保存エラー:', error);
    // 削除を元に戻す
    employees.splice(index, 0, deletedEmployee);
    initializeEmployeeIndexes();
    res.status(500).json({ ok: false, error: 'ファイル保存に失敗しました' });
  }
});

// 社員情報更新API（IDベース）
app.put('/api/admin/employees/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { code, name, department_id } = req.body;
  
  logger.info(`社員更新API呼び出し: ID=${id}, code=${code}, name=${name}, department_id=${department_id}`);
  
  if (!code || !name) {
    return res.status(400).json({ error: '社員番号と名前は必須です' });
  }
  
  const employeeArrayIndex = employeeIdIndex.get(id);
  if (employeeArrayIndex === undefined) {
    logger.warn(`社員が見つかりません: ID=${id}`);
    return res.status(404).json({ error: '社員が見つかりません' });
  }
  
  // 社員番号の重複チェック（自分以外）
  const existingEmployeeIndex = employeeIndex.get(code);
  if (existingEmployeeIndex !== undefined && existingEmployeeIndex !== employeeArrayIndex) {
    logger.warn(`社員番号重複: ${code} (既存ID: ${employees[existingEmployeeIndex].id})`);
    return res.status(400).json({ error: 'この社員番号は既に使用されています' });
  }
  
  // 部署IDの存在チェック
  if (department_id && !departmentIndex.has(department_id)) {
    logger.warn(`部署が見つかりません: department_id=${department_id}`);
    return res.status(400).json({ error: '指定された部署が存在しません' });
  }
  
  // 社員情報を更新
  const oldEmployee = { ...employees[employeeArrayIndex] };
  employees[employeeArrayIndex] = {
    ...employees[employeeArrayIndex],
    code: code.trim(),
    name: name.trim(),
    department_id: department_id || null
  };
  
  // 部署名を更新
  if (department_id) {
    const department = departmentIndex.get(department_id);
    if (department) {
      employees[employeeArrayIndex].dept = department.name;
    }
  } else {
    employees[employeeArrayIndex].dept = '未所属';
  }
  
  // インデックスを更新（社員番号が変更された場合）
  if (oldEmployee.code !== code) {
    employeeIndex.delete(oldEmployee.code);
    employeeIndex.set(code, employeeArrayIndex);
  }
  
  // ファイルに保存
  try {
    saveData(EMPLOYEES_FILE, employees);
    logger.info(`✅ 社員情報更新成功: ${oldEmployee.name} -> ${name} (ID: ${id})`);
    res.json({ 
      ok: true, 
      message: `社員情報を更新しました: ${name}`, 
      employee: employees[employeeArrayIndex],
      list: employees 
    });
  } catch (error) {
    logger.error('❌ 社員更新ファイル保存エラー:', error);
    // 更新を元に戻す
    employees[employeeArrayIndex] = oldEmployee;
    res.status(500).json({ ok: false, error: 'ファイル保存に失敗しました' });
  }
});

// 勤怠データ（永続化対応）
const attendanceData: { [key: string]: any } = loadData(ATTENDANCE_FILE, {});

// 備考データ（永続化対応）
const remarksData: { [key: string]: string } = loadData(REMARKS_FILE, {});

// 祝日データ（環境変数で外部化可能）
const HOLIDAYS_FILE = path.join(DATA_DIR, 'holidays.json');
const defaultHolidays: { [key: string]: string } = {
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日'
};
const holidays: { [key: string]: string } = loadData(HOLIDAYS_FILE, defaultHolidays);

// 日付ユーティリティ関数
const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6; // 0=日曜, 6=土曜
};

const isHoliday = (dateStr: string): boolean => {
  return dateStr in holidays;
};

const getHolidayName = (dateStr: string): string | null => {
  return holidays[dateStr] || null;
};

const isWorkingDay = (dateStr: string): boolean => {
  return !isWeekend(dateStr) && !isHoliday(dateStr);
};

// 勤怠データAPI
app.get('/api/admin/attendance', (req, res) => {
  const { date } = req.query as { date?: string };
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  const list = employees
    .sort((a, b) => a.code.localeCompare(b.code)) // 社員番号順でソート
    .map(emp => {
      const attendanceKey = `${targetDate}-${emp.code}`;
      const attendance = attendanceData[attendanceKey];
      const remarkKey = `${targetDate}-${emp.code}`;
      const remark = remarksData[remarkKey] || '';
      const department = emp.department_id ? departments.find(d => d.id === emp.department_id) : undefined;
      const deptName = department?.name || emp.dept || '未所属';
      
      return {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        dept: deptName,
        department_id: emp.department_id,
        clock_in: attendance?.clock_in || null,
        clock_out: attendance?.clock_out || null,
        status: attendance?.clock_in && attendance?.clock_out ? '退勤' : 
                attendance?.clock_in ? '出勤中' : '未出勤',
        remark
      };
    });
  
  res.json({ ok: true, date: targetDate, list });
});

app.get('/api/admin/master', (req, res) => {
  const { date } = req.query as { date?: string };
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  logger.info(`📊 マスターAPI呼び出し: ${targetDate}, 社員数: ${employees.length}`);
  
  // マスターページアクセス時に勤怠データを自動初期化
  let initializedCount = 0;
  employees.forEach(emp => {
    const key = `${targetDate}-${emp.code}`;
    if (!attendanceData[key]) {
      attendanceData[key] = {
        clock_in: null,
        clock_out: null,
        late: 0,
        early: 0,
        overtime: 0,
        night: 0,
        work_minutes: 0
      };
      initializedCount++;
      // 大量の社員がいる場合は個別ログを出力しない（パフォーマンス向上）
      if (employees.length <= 50) {
        logger.info(`🆕 勤怠データ作成: ${emp.name} (${emp.code}) - ${targetDate}`);
      }
    }
  });
  
  if (initializedCount > 0) {
    saveData(ATTENDANCE_FILE, attendanceData);
    logger.info(`✅ マスターページアクセス時自動初期化: ${initializedCount}名の社員のパーソナルページを作成しました (${targetDate})`);
  }
  
  // 各社員の勤怠データを生成（社員番号順でソート）
  // パフォーマンス向上のため、事前にソート済みの配列を作成
  const sortedEmployees = [...employees].sort((a, b) => a.code.localeCompare(b.code));
  
  const list = sortedEmployees.map(emp => {
    const key = `${targetDate}-${emp.code}`;
    const attendance = attendanceData[key] || {};
    
    // 部署名は常にdepartment_idから算出（インデックスを使用してパフォーマンス向上）
    const department = emp.department_id ? departmentIndex.get(emp.department_id) : undefined;
    const deptName = department?.name || emp.dept || '未所属';
    
    return {
      id: emp.id,
      code: emp.code,
      name: emp.name,
      dept: deptName,
      department_id: emp.department_id,
      clock_in: attendance.clock_in || null,
      clock_out: attendance.clock_out || null,
      status: attendance.clock_in ? (attendance.clock_out ? "退勤済み" : "出勤中") : "未出勤",
      late: attendance.late || 0,
      early: attendance.early || 0,
      overtime: attendance.overtime || 0,
      night: attendance.night || 0,
      // 土日祝日情報を追加
      isWeekend: isWeekend(targetDate),
      isHoliday: isHoliday(targetDate),
      holidayName: getHolidayName(targetDate),
      isWorkingDay: isWorkingDay(targetDate)
    };
  });
  
  logger.info(`📋 マスターAPI応答: ${list.length}名の社員データを返します`);
  res.json({ ok: true, date: targetDate, list });
});


// 出勤・退勤API（パブリック用エイリアス追加）
app.post('/api/public/clock-in', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Employee code is required' });
  }
  
  const employee = employees.find(e => e.code === code);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}-${code}`;
  const now = new Date();
  
  // 既に出勤済みかチェック
  if (attendanceData[key]?.clock_in) {
    logger.warn(`重複出勤: ${employee.name} (${code}) - 既に出勤済み`);
    return res.json({
      ok: true,
      message: `${employee.name}さんは既に出勤済みです`,
      time: new Date(attendanceData[key].clock_in).toLocaleTimeString('ja-JP'),
      employee: employee.name,
      department: employee.dept,
      idempotent: true
    });
  }
  
  // 遅刻判定: 10:00以降の出勤は遅刻
  const workStartTime = new Date(now);
  workStartTime.setHours(10, 0, 0, 0); // 10:00
  
  let lateMinutes = 0;
  if (now > workStartTime) {
    lateMinutes = Math.floor((now.getTime() - workStartTime.getTime()) / (1000 * 60));
  }
  
  attendanceData[key] = {
    ...attendanceData[key],
    clock_in: now.toISOString(),
    late: lateMinutes
  };
  saveData(ATTENDANCE_FILE, attendanceData);
  
  const lateMessage = lateMinutes > 0 ? ` (${lateMinutes}分遅刻)` : '';
  logger.info(`出勤打刻: ${employee.name} (${code}) ${lateMessage}`);
  
  res.json({
    ok: true,
    message: `${employee.name}さんの出勤を記録しました${lateMessage}`,
    time: now.toLocaleTimeString('ja-JP'),
    late: lateMinutes
  });
});

// 出勤・退勤API（既存）
app.post('/api/attendance/checkin', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Employee code is required' });
  }
  
  const employee = employees.find(e => e.code === code);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}-${code}`;
  const now = new Date();
  
  // 既に出勤済みかチェック
  if (attendanceData[key]?.clock_in) {
    logger.warn(`重複出勤: ${employee.name} (${code}) - 既に出勤済み`);
    return res.json({
      ok: true,
      message: `${employee.name}さんは既に出勤済みです`,
      time: new Date(attendanceData[key].clock_in).toLocaleTimeString('ja-JP'),
      employee: employee.name,
      department: employee.dept,
      idempotent: true
    });
  }
  
  // 遅刻判定: 10:00以降の出勤は遅刻
  const workStartTime = new Date(now);
  workStartTime.setHours(10, 0, 0, 0); // 10:00
  
  let lateMinutes = 0;
  if (now > workStartTime) {
    lateMinutes = Math.floor((now.getTime() - workStartTime.getTime()) / (1000 * 60));
  }
  
  attendanceData[key] = {
    ...attendanceData[key],
    clock_in: now.toISOString(),
    late: lateMinutes
  };
  saveData(ATTENDANCE_FILE, attendanceData);
  
  const lateMessage = lateMinutes > 0 ? ` (${lateMinutes}分遅刻)` : '';
  logger.info(`出勤打刻: ${employee.name} (${code}) ${lateMessage}`);
  
  res.json({
    ok: true,
    message: `${employee.name}さんの出勤を記録しました${lateMessage}`,
    time: now.toLocaleTimeString('ja-JP'),
    late: lateMinutes
  });
});

app.post('/api/public/clock-out', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Employee code is required' });
  }
  
  const employee = employees.find(e => e.code === code);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}-${code}`;
  const now = new Date();
  
  // 出勤記録がない場合
  if (!attendanceData[key]?.clock_in) {
    logger.warn(`退勤エラー: ${employee.name} (${code}) - 出勤記録なし`);
    return res.status(400).json({ 
      error: '出勤記録がありません。先に出勤打刻を行ってください。' 
    });
  }
  
  // 既に退勤済みかチェック
  if (attendanceData[key]?.clock_out) {
    console.log(`⚠️ 重複退勤: ${employee.name} (${code}) - 既に退勤済み`);
    return res.json({
      ok: true,
      message: `${employee.name}さんは既に退勤済みです`,
      time: new Date(attendanceData[key].clock_out).toLocaleTimeString('ja-JP'),
      idempotent: true
    });
  }
  
  const clockIn = new Date(attendanceData[key].clock_in);
  
  // 早退判定: 18:00より前の退勤は早退
  const workEndTime = new Date(now);
  workEndTime.setHours(18, 0, 0, 0); // 18:00
  
  let earlyMinutes = 0;
  if (now < workEndTime) {
    earlyMinutes = Math.floor((workEndTime.getTime() - now.getTime()) / (1000 * 60));
  }
  
  // 残業判定: 18:00以降の退勤は残業
  let overtimeMinutes = 0;
  if (now > workEndTime) {
    overtimeMinutes = Math.floor((now.getTime() - workEndTime.getTime()) / (1000 * 60));
  }
  
  // 深夜勤務判定: 22:00以降の勤務は深夜勤務
  const nightStartTime = new Date(now);
  nightStartTime.setHours(22, 0, 0, 0); // 22:00
  
  let nightMinutes = 0;
  if (now > nightStartTime) {
    nightMinutes = Math.floor((now.getTime() - nightStartTime.getTime()) / (1000 * 60));
  }
  
  // 勤務時間計算
  const workMinutes = Math.floor((now.getTime() - clockIn.getTime()) / (1000 * 60));
  
  attendanceData[key] = {
    ...attendanceData[key],
    clock_out: now.toISOString(),
    early: earlyMinutes,
    overtime: overtimeMinutes,
    night: nightMinutes,
    work_minutes: workMinutes
  };
  saveData(ATTENDANCE_FILE, attendanceData);
  
  const earlyMessage = earlyMinutes > 0 ? ` (${earlyMinutes}分早退)` : '';
  const overtimeMessage = overtimeMinutes > 0 ? ` (${overtimeMinutes}分残業)` : '';
  const nightMessage = nightMinutes > 0 ? ` (${nightMinutes}分深夜勤務)` : '';
  
  console.log(`✅ 退勤打刻: ${employee.name} (${code}) 勤務時間: ${Math.floor(workMinutes/60)}時間${workMinutes%60}分${earlyMessage}${overtimeMessage}${nightMessage}`);
  
  res.json({
    ok: true,
    message: `${employee.name}さんの退勤を記録しました${earlyMessage}${overtimeMessage}${nightMessage}`,
    time: now.toLocaleTimeString('ja-JP'),
    work_minutes: workMinutes,
    early: earlyMinutes,
    overtime: overtimeMinutes,
    night: nightMinutes
  });
});

app.post('/api/attendance/checkout', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Employee code is required' });
  }
  
  const employee = employees.find(e => e.code === code);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}-${code}`;
  
  if (!attendanceData[key]?.clock_in) {
    return res.status(400).json({ error: 'No clock-in record found' });
  }
  
  const now = new Date();
  
  // 早退判定: 18:00前の退勤は早退
  const workEndTime = new Date(now);
  workEndTime.setHours(18, 0, 0, 0); // 18:00
  
  let earlyMinutes = 0;
  if (now < workEndTime) {
    earlyMinutes = Math.floor((workEndTime.getTime() - now.getTime()) / (1000 * 60));
  }
  
  // 残業・深夜勤務計算
  const clockInTime = new Date(attendanceData[key].clock_in);
  const workDurationMs = now.getTime() - clockInTime.getTime();
  const workDurationMinutes = Math.floor(workDurationMs / (1000 * 60));
  
  // 8時間(480分) + 休憩時間を超えた分を残業とする
  const standardWorkMinutes = 8 * 60; // 480分
  const breakMinutes = 60; // 1時間休憩
  let overtimeMinutes = Math.max(0, workDurationMinutes - standardWorkMinutes - breakMinutes);
  
  // 深夜勤務時間計算（22:00-5:00）
  let nightMinutes = 0;
  const nightStart = new Date(now);
  nightStart.setHours(22, 0, 0, 0);
  const nextDayNightEnd = new Date(now);
  nextDayNightEnd.setDate(nextDayNightEnd.getDate() + 1);
  nextDayNightEnd.setHours(5, 0, 0, 0);
  
  // 22:00以降の勤務時間を深夜勤務として計算
  if (now.getHours() >= 22 || now.getHours() < 5) {
    if (now.getHours() >= 22) {
      nightMinutes = Math.floor((now.getTime() - nightStart.getTime()) / (1000 * 60));
    } else if (now.getHours() < 5) {
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      nightMinutes = Math.floor((now.getTime() - todayMidnight.getTime()) / (1000 * 60));
    }
  }
  
  attendanceData[key] = {
    ...attendanceData[key],
    clock_out: now.toISOString(),
    early: earlyMinutes,
    overtime: overtimeMinutes,
    night: nightMinutes
  };
  saveData(ATTENDANCE_FILE, attendanceData);
  
  const earlyMessage = earlyMinutes > 0 ? ` (${earlyMinutes}分早退)` : '';
  const overtimeMessage = overtimeMinutes > 0 ? ` (残業${Math.floor(overtimeMinutes/60)}時間${overtimeMinutes%60}分)` : '';
  console.log(`✅ 退勤打刻: ${employee.name} (${code})${earlyMessage}${overtimeMessage}`);
  
  res.json({
    ok: true,
    message: `${employee.name}さんの退勤を記録しました${earlyMessage}${overtimeMessage}`,
    time: now.toLocaleTimeString('ja-JP'),
    early: earlyMinutes,
    overtime: overtimeMinutes,
    night: nightMinutes
  });
});

// 備考取得API
app.get('/api/admin/remarks/:employeeCode/:date', (req, res) => {
  const { employeeCode, date } = req.params;
  const key = `${date}-${employeeCode}`;
  const remark = remarksData[key] || '';
  
  res.json({
    ok: true,
    remark,
    date,
    employeeCode
  });
});

// 備考保存API
app.post('/api/admin/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body;
  
  if (!employeeCode || !date) {
    return res.status(400).json({ error: 'Employee code and date are required' });
  }
  
  const key = `${date}-${employeeCode}`;
  remarksData[key] = remark || '';
  saveData(REMARKS_FILE, remarksData);
  
  res.json({
    ok: true,
    message: 'Remark saved successfully',
    remark,
    date,
    employeeCode
  });
});

// 備考一括取得API（月別表示用）
app.get('/api/admin/remarks/:employeeCode', (req, res) => {
  const { employeeCode } = req.params as { employeeCode: string };
  const { month } = req.query as { month?: string }; // YYYY-MM format
  
  // 社員存在チェック（社員が存在しなくても空の備考を返す）
  const employee = employees.find(e => e.code === employeeCode);
  if (!employee) {
    console.log(`⚠️ 社員コード ${employeeCode} が見つかりません。空の備考を返します。`);
  }
  
  const remarks: { [key: string]: string } = {};
  
  if (month) {
    // 指定月の備考のみ取得
    Object.keys(remarksData).forEach(key => {
      if (key.includes(employeeCode) && key.startsWith(month)) {
        const date = key.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
        remarks[date] = remarksData[key];
      }
    });
  } else {
    // 全ての備考を取得
    Object.keys(remarksData).forEach(key => {
      if (key.includes(employeeCode)) {
        const date = key.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
        remarks[date] = remarksData[key];
      }
    });
  }
  
  res.json({
    ok: true,
    remarks,
    employeeCode,
    employee: employee ? { code: employee.code, name: employee.name } : null
  });
});

// デバッグ用エンドポイントは本番環境でセキュリティリスクのため削除

// ==================== バックアップAPI エンドポイント ====================
// バックアップ一覧取得API
app.get('/api/admin/backups', (req, res) => {
  try {
    const backups = getBackupList();
    res.json({ ok: true, backups });
  } catch (error) {
    logger.error('❌ バックアップ一覧API エラー:', error);
    res.status(500).json({ ok: false, error: 'バックアップ一覧の取得に失敗しました' });
  }
});

// バックアップ復元API
app.post('/api/admin/backups/restore', (req, res) => {
  try {
    const { backupName } = req.body;
    
    if (!backupName) {
      return res.status(400).json({ ok: false, error: 'バックアップ名が必要です' });
    }
    
    if (restoreBackup(backupName)) {
      res.json({ ok: true, message: `バックアップを復元しました: ${backupName}` });
    } else {
      res.status(500).json({ ok: false, error: 'バックアップの復元に失敗しました' });
    }
  } catch (error) {
    logger.error('❌ バックアップ復元API エラー:', error);
    res.status(500).json({ ok: false, error: 'バックアップの復元に失敗しました' });
  }
});

// 手動バックアップ作成API
app.post('/api/admin/backups/create', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `manual_backup_${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    logger.debug(`📁 バックアップ作成開始: ${backupName}`);
    logger.debug(`📁 BACKUP_DIR: ${BACKUP_DIR}`);
    logger.debug(`📁 backupPath: ${backupPath}`);
    
    // バックアップディレクトリを作成
    if (!existsSync(BACKUP_DIR)) {
      logger.debug(`📁 BACKUP_DIRを作成中: ${BACKUP_DIR}`);
      mkdirSync(BACKUP_DIR, { recursive: true });
      logger.debug(`📁 BACKUP_DIR作成完了: ${existsSync(BACKUP_DIR)}`);
    } else {
      logger.debug(`📁 BACKUP_DIRは既に存在します: ${BACKUP_DIR}`);
    }
    
    // 手動バックアップディレクトリを作成
    logger.debug(`📁 バックアップディレクトリを作成中: ${backupPath}`);
    mkdirSync(backupPath, { recursive: true });
    logger.debug(`📁 バックアップディレクトリ作成完了: ${existsSync(backupPath)}`);
    
    // データファイルをコピー
    const files = ['employees.json', 'departments.json', 'attendance.json', 'holidays.json', 'personal_pages.json'];
    let backupSize = 0;
    
    files.forEach(file => {
      const sourcePath = path.join(DATA_DIR, file);
      const destPath = path.join(backupPath, file);
      
      if (existsSync(sourcePath)) {
        logger.debug(`📄 ファイルコピー中: ${file} -> ${destPath}`);
        copyFileSync(sourcePath, destPath);
        const fileSize = statSync(sourcePath).size;
        backupSize += fileSize;
        logger.debug(`📄 ファイルコピー完了: ${file} (${(fileSize / 1024).toFixed(1)}KB)`);
      } else {
        logger.debug(`⚠️ ファイルが存在しません: ${sourcePath}`);
      }
    });
    
    logger.info(`✅ 手動バックアップ作成: ${backupName} (${(backupSize / 1024).toFixed(1)}KB)`);
    logger.debug(`📁 最終確認 - バックアップディレクトリ存在: ${existsSync(backupPath)}`);
    
    res.json({ 
      ok: true, 
      message: `手動バックアップを作成しました: ${backupName}`,
      backupName,
      size: Math.round(backupSize / 1024 * 100) / 100
    });
  } catch (error) {
    logger.error('❌ 手動バックアップ作成API エラー:', error);
    res.status(500).json({ ok: false, error: '手動バックアップの作成に失敗しました' });
  }
});

// バックアップ削除API
app.delete('/api/admin/backups/delete', (req, res) => {
  try {
    const { backupName } = req.body;
    
    if (!backupName) {
      return res.status(400).json({ ok: false, error: 'バックアップ名が必要です' });
    }
    
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    if (!existsSync(backupPath)) {
      return res.status(404).json({ ok: false, error: 'バックアップが見つかりません' });
    }
    
    // バックアップディレクトリを削除
    rmSync(backupPath, { recursive: true, force: true });
    
    logger.info(`✅ バックアップ削除: ${backupName}`);
    res.json({ ok: true, message: `バックアップを削除しました: ${backupName}` });
  } catch (error) {
    logger.error('❌ バックアップ削除API エラー:', error);
    res.status(500).json({ ok: false, error: 'バックアップの削除に失敗しました' });
  }
});

// SPAのルーティング対応（API以外のリクエストをindex.htmlに転送）
app.get('*', (req, res) => {
  logger.debug(`Wildcard route hit: ${req.path}, staticFilesEnabled: ${staticFilesEnabled}`);
  
  if (!req.path.startsWith('/api')) {
    if (staticFilesEnabled) {
      const indexPath = path.join(frontendPath, 'index.html');
      logger.debug(`Serving index.html from: ${indexPath}`);
      res.sendFile(indexPath);
    } else {
      logger.warn(`Static files not enabled`);
      res.status(503).json({ 
        error: 'Frontend not available', 
        message: 'Static files not found. Please check FRONTEND_PATH configuration.',
        frontendPath: frontendPath
      });
    }
  } else {
    logger.warn(`API endpoint not found: ${req.path}`);
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// 勤怠データ自動初期化関数（今日と明日分を作成）
const autoInitializeAttendance = () => {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let initializedCount = 0;
  
  // 全社員の勤怠データを自動初期化（今日と明日分）
  employees.forEach(emp => {
    // 今日の勤怠データ
    const todayKey = `${today}-${emp.code}`;
    if (!attendanceData[todayKey]) {
      attendanceData[todayKey] = {
        clock_in: null,
        clock_out: null,
        late: 0,
        early: 0,
        overtime: 0,
        night: 0,
        work_minutes: 0
      };
      initializedCount++;
    }
    
    // 明日の勤怠データ
    const tomorrowKey = `${tomorrow}-${emp.code}`;
    if (!attendanceData[tomorrowKey]) {
      attendanceData[tomorrowKey] = {
        clock_in: null,
        clock_out: null,
        late: 0,
        early: 0,
        overtime: 0,
        night: 0,
        work_minutes: 0
      };
      initializedCount++;
    }
  });
  
  if (initializedCount > 0) {
    saveData(ATTENDANCE_FILE, attendanceData);
    logger.info(`✅ 自動初期化: ${initializedCount}件の勤怠データを作成しました (${today} & ${tomorrow})`);
  } else {
    logger.info(`ℹ️ 勤怠データは既に初期化済みです (${today} & ${tomorrow})`);
  }
};

// ==================== バックアップシステム ====================
// バックアップ設定（軽量版）
const BACKUP_INTERVAL = 60 * 60 * 1000; // 60分 = 3600秒
const BACKUP_COUNT = 24; // 24個のバックアップのみ保持（24時間分）
const BACKUP_DIR = path.join(DATA_DIR, '..', 'backups');

// ファイルのハッシュを取得（変更検出用）
const getFileHash = (filePath: string): string | null => {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath);
    return createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
};

// 上書きバックアップ関数（ディスク節約版）
const createOverwriteBackup = () => {
  try {
    // バックアップディレクトリを作成
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // 既存のバックアップをローテーション（古いものを削除）
    const existingBackups = readdirSync(BACKUP_DIR)
      .filter((file: string) => file.startsWith('backup_'))
      .sort();
    
    // 古いバックアップを削除（最新5個のみ保持）
    if (existingBackups.length >= BACKUP_COUNT) {
      const toDelete = existingBackups.slice(0, existingBackups.length - BACKUP_COUNT + 1);
      toDelete.forEach((file: string) => {
        rmSync(path.join(BACKUP_DIR, file), { recursive: true, force: true });
        logger.debug(`🗑️ 古いバックアップを削除: ${file}`);
      });
    }
    
    // 新しいバックアップを作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
    mkdirSync(backupPath, { recursive: true });
    
    // データファイルをコピー（差分チェック付き）
    const files = ['employees.json', 'departments.json', 'attendance.json', 'holidays.json', 'personal_pages.json'];
    let hasChanges = false;
    let backupSize = 0;
    
    files.forEach(file => {
      const sourcePath = path.join(DATA_DIR, file);
      const destPath = path.join(backupPath, file);
      
      if (existsSync(sourcePath)) {
        // ファイルが変更されているかチェック
        const sourceHash = getFileHash(sourcePath);
        const destHash = existsSync(destPath) ? getFileHash(destPath) : null;
        
        if (sourceHash && sourceHash !== destHash) {
          copyFileSync(sourcePath, destPath);
          hasChanges = true;
          const fileSize = statSync(sourcePath).size;
          backupSize += fileSize;
          logger.debug(`📁 バックアップ更新: ${file} (${(fileSize / 1024).toFixed(1)}KB)`);
        }
      }
    });
    
    if (hasChanges) {
      logger.info(`✅ バックアップ更新: ${timestamp} (${(backupSize / 1024).toFixed(1)}KB)`);
    } else {
      logger.debug(`ℹ️ 変更なし、バックアップスキップ: ${timestamp}`);
    }
    
  } catch (error) {
    logger.error('❌ バックアップエラー:', error);
  }
};

// バックアップ復元関数
const restoreBackup = (backupName: string): boolean => {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    if (!existsSync(backupPath)) {
      logger.error(`❌ バックアップが見つかりません: ${backupName}`);
      return false;
    }
    
    // 現在のデータをバックアップ
    const currentBackup = `${DATA_DIR}.backup_${Date.now()}`;
    cpSync(DATA_DIR, currentBackup, { recursive: true });
    logger.info(`💾 現在のデータをバックアップ: ${currentBackup}`);
    
    // バックアップを復元
    const files = ['employees.json', 'departments.json', 'attendance.json', 'holidays.json', 'personal_pages.json'];
    files.forEach(file => {
      const sourcePath = path.join(backupPath, file);
      const destPath = path.join(DATA_DIR, file);
      
      if (existsSync(sourcePath)) {
        copyFileSync(sourcePath, destPath);
        logger.info(`🔄 復元: ${file}`);
      }
    });
    
    logger.info(`✅ バックアップ復元成功: ${backupName}`);
    return true;
    
  } catch (error) {
    logger.error('❌ バックアップ復元エラー:', error);
    return false;
  }
};

// バックアップ一覧取得関数
const getBackupList = () => {
  try {
    if (!existsSync(BACKUP_DIR)) return [];
    
    return readdirSync(BACKUP_DIR)
      .filter((file: string) => file.startsWith('backup_') || file.startsWith('manual_backup_'))
      .map((file: string) => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = statSync(filePath);
        const size = readdirSync(filePath)
          .reduce((total: number, f: string) => {
            const fileStats = statSync(path.join(filePath, f));
            return total + fileStats.size;
          }, 0);
        
        return {
          name: file,
          date: stats.mtime.toISOString(),
          size: Math.round(size / 1024 * 100) / 100 // KB
        };
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    logger.error('❌ バックアップ一覧取得エラー:', error);
    return [];
  }
};


// 自動バックアップを開始
let backupInterval: NodeJS.Timeout | null = null;

const startBackupSystem = () => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  
  backupInterval = setInterval(createOverwriteBackup, BACKUP_INTERVAL);
  logger.info(`🔄 上書きバックアップ開始: ${BACKUP_INTERVAL/60000}分間隔、最大${BACKUP_COUNT}個保持`);
};

const stopBackupSystem = () => {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    logger.info('⏹️ バックアップシステム停止');
  }
};

// ==================== サーバー起動 ====================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`Backend server running on http://127.0.0.1:${PORT}`);
  logger.info(`Frontend will be served at http://127.0.0.1:${PORT}`);
  logger.info(`Static files from: ${frontendPath}`);
  
  // サーバー起動時に勤怠データを自動初期化
  autoInitializeAttendance();
  
  // バックアップシステムを開始
  startBackupSystem();
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  logger.info('🛑 サーバー終了中...');
  stopBackupSystem();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 サーバー終了中...');
  stopBackupSystem();
  process.exit(0);
});