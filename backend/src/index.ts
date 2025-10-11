// src/index.ts
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeJsonAtomic } from './helpers/writeJsonAtomic.js';

// ・井ｻｻ諢擾ｼ峨ヰ繝・け繧｢繝・・蛛･蠎ｷ繝√ぉ繝・け縺縺大挨繝輔ぃ繧､繝ｫ縺ｪ繧我ｽｿ縺・
// import { registerBackupsHealth } from './backupsHealth.js';

const app = express();
app.use(express.json());

// ---- 蝓ｺ譛ｬ繝倥Ν繧ｹ ----
app.get('/__ping', (_req, res) => res.type('text/plain').send('pong'));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// 邂｡逅・・畑繝倥Ν繧ｹ繝√ぉ繝・け
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
    res.status(200).json({
      ok: false,
      status: 'unhealthy',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// 繧ｻ繝・す繝ｧ繝ｳ邂｡逅・PI
const sessions = new Map<string, { user: any; createdAt: Date; expiresAt: Date }>();

// 繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ・
app.post('/api/admin/sessions', (req, res) => {
  try {
    const { code, name, department, rememberMe } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)); // 30譌･ or 1譌･
    
    const user = { code, name, department, isAdmin: true };
    sessions.set(sessionId, { user, createdAt: now, expiresAt });
    
    res.json({
      ok: true,
      sessionId,
      user,
      message: '繧ｻ繝・す繝ｧ繝ｳ縺御ｿ晏ｭ倥＆繧後∪縺励◆'
    });
  } catch (error) {
    console.error('繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(200).json({
      ok: false,
      error: '繧ｻ繝・す繝ｧ繝ｳ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// 繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ・
app.get('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(200).json({
        ok: false,
        error: '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
      });
    }
    
    if (new Date() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(200).json({
        ok: false,
        error: '繧ｻ繝・す繝ｧ繝ｳ縺梧悄髯仙・繧後〒縺・
      });
    }
    
    res.json({
      ok: true,
      user: session.user
    });
  } catch (error) {
    console.error('繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(200).json({
      ok: false,
      error: '繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// 繧ｻ繝・す繝ｧ繝ｳ蜑企勁
app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = sessions.delete(sessionId);
    
    res.json({
      ok: true,
      message: deleted ? '繧ｻ繝・す繝ｧ繝ｳ縺悟炎髯､縺輔ｌ縺ｾ縺励◆' : '繧ｻ繝・す繝ｧ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
    });
  } catch (error) {
    console.error('繧ｻ繝・す繝ｧ繝ｳ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
    res.status(200).json({
      ok: false,
      error: '繧ｻ繝・す繝ｧ繝ｳ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
    });
  }
});

// ---- 縺薙％縺九ｉ莠呈鋤繝溘ル迚茨ｼ壹ョ繝ｼ繧ｿ隱ｭ縺ｿ蜿悶ｊ縺縺大ｮ溯｣・----
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
    // 遐ｴ謳肴凾縺ｯ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
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

// --- 荳ｻ隕、PI・郁ｪｭ縺ｿ蜿悶ｊ蟆ら畑・・--

// 驛ｨ鄂ｲ荳隕ｧ
app.get('/api/admin/departments', (_req, res) => {
  try {
    res.json({ ok: true, departments });
  } catch (error) {
    console.error('Departments API error:', error);
    res.status(200).json({ ok: false, error: 'Failed to fetch departments' });
  }
});

// 驛ｨ鄂ｲ菴懈・
app.post('/api/admin/departments', (req, res) => {
  console.log('POST /api/admin/departments called with body:', req.body);
  
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.log('Validation failed: name is required');
      return res.status(200).json({ 
        ok: false, 
        error: '驛ｨ鄂ｲ蜷阪・蠢・医〒縺・ 
      });
    }
    
    // 譁ｰ縺励＞驛ｨ鄂ｲID繧堤函謌撰ｼ域里蟄倥・譛螟ｧID + 1・・
    const maxId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) : 0;
    const newId = maxId + 1;
    
    // 驥崎､・メ繧ｧ繝・け
    const existingDept = departments.find(d => d.name === name.trim());
    if (existingDept) {
      console.log('Validation failed: department already exists');
      return res.status(200).json({ 
        ok: false, 
        error: '蜷後§蜷榊燕縺ｮ驛ｨ鄂ｲ縺梧里縺ｫ蟄伜惠縺励∪縺・ 
      });
    }
    
    // 譁ｰ縺励＞驛ｨ鄂ｲ繧剃ｽ懈・
    const newDepartment = {
      id: newId,
      name: name.trim()
    };
    
    departments.push(newDepartment);
    deptIndex.set(newId, newDepartment);
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    console.log('Department created successfully:', newDepartment);
    res.status(200).json({ 
      ok: true, 
      department: newDepartment,
      message: '驛ｨ鄂ｲ縺御ｽ懈・縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Department creation error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '驛ｨ鄂ｲ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 驛ｨ鄂ｲ譖ｴ譁ｰ
app.put('/api/admin/departments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const departmentId = parseInt(id);
    
    if (isNaN(departmentId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '辟｡蜉ｹ縺ｪ驛ｨ鄂ｲID縺ｧ縺・ 
      });
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(200).json({ 
        ok: false, 
        error: '驛ｨ鄂ｲ蜷阪・蠢・医〒縺・ 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '驛ｨ鄂ｲ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' 
      });
    }
    
    // 驥崎､・メ繧ｧ繝・け・郁・蛻・ｻ･螟厄ｼ・
    const existingDept = departments.find(d => d.name === name.trim() && d.id !== departmentId);
    if (existingDept) {
      return res.status(200).json({ 
        ok: false, 
        error: '蜷後§蜷榊燕縺ｮ驛ｨ鄂ｲ縺梧里縺ｫ蟄伜惠縺励∪縺・ 
      });
    }
    
    // 驛ｨ鄂ｲ繧呈峩譁ｰ
    departments[departmentIndex].name = name.trim();
    deptIndex.set(departmentId, departments[departmentIndex]);
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    res.json({ 
      ok: true, 
      department: departments[departmentIndex],
      message: '驛ｨ鄂ｲ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Department update error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '驛ｨ鄂ｲ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 驛ｨ鄂ｲ蜑企勁
app.delete('/api/admin/departments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = parseInt(id);
    
    if (isNaN(departmentId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '辟｡蜉ｹ縺ｪ驛ｨ鄂ｲID縺ｧ縺・ 
      });
    }
    
    const departmentIndex = departments.findIndex(d => d.id === departmentId);
    if (departmentIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '驛ｨ鄂ｲ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' 
      });
    }
    
    // 遉ｾ蜩｡縺後％縺ｮ驛ｨ鄂ｲ縺ｫ謇螻槭＠縺ｦ縺・ｋ縺九メ繧ｧ繝・け
    const employeesInDept = employees.filter(e => e.department_id === departmentId);
    if (employeesInDept.length > 0) {
      return res.status(200).json({ 
        ok: false, 
        error: `縺薙・驛ｨ鄂ｲ縺ｫ縺ｯ${employeesInDept.length}蜷阪・遉ｾ蜩｡縺梧園螻槭＠縺ｦ縺・∪縺吶ょ・縺ｫ遉ｾ蜩｡縺ｮ驛ｨ鄂ｲ繧貞､画峩縺励※縺上□縺輔＞縲Ａ 
      });
    }
    
    // 驛ｨ鄂ｲ繧貞炎髯､
    departments.splice(departmentIndex, 1);
    deptIndex.delete(departmentId);
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    
    res.json({ 
      ok: true, 
      message: '驛ｨ鄂ｲ縺悟炎髯､縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Department deletion error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '驛ｨ鄂ｲ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 遉ｾ蜩｡荳隕ｧ・・ept蜷阪・隗｣豎ｺ繧貞性繧・・
app.get('/api/admin/employees', (_req, res) => {
  const list = employees.map(e => {
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '譛ｪ謇螻・)
      : (e.dept ?? '譛ｪ謇螻・);
    return { ...e, dept };
  });
  res.json({ ok: true, employees: list });
});

// 遉ｾ蜩｡菴懈・
app.post('/api/admin/employees', (req, res) => {
  try {
    const { code, name, department_id } = req.body;
    
    if (!code || !name) {
      return res.status(200).json({ 
        ok: false, 
        error: '遉ｾ蜩｡繧ｳ繝ｼ繝峨→蜷榊燕縺ｯ蠢・医〒縺・ 
      });
    }
    
    // 驥崎､・メ繧ｧ繝・け
    const existingEmployee = employees.find(e => e.code === code);
    if (existingEmployee) {
      return res.status(200).json({ 
        ok: false, 
        error: '蜷後§遉ｾ蜩｡繧ｳ繝ｼ繝峨・遉ｾ蜩｡縺梧里縺ｫ蟄伜惠縺励∪縺・ 
      });
    }
    
    // 驛ｨ鄂ｲID縺ｮ讀懆ｨｼ
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(200).json({ 
        ok: false, 
        error: '謖・ｮ壹＆繧後◆驛ｨ鄂ｲ縺悟ｭ伜惠縺励∪縺帙ｓ' 
      });
    }
    
    // 譁ｰ縺励＞遉ｾ蜩｡繧剃ｽ懈・
    const newEmployee = {
      id: employees.length + 1,
      code: code.trim(),
      name: name.trim(),
      department_id: department_id || null,
      dept: department_id ? deptIndex.get(department_id)?.name : null
    };
    
    employees.push(newEmployee);
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.status(201).json({ 
      ok: true, 
      employee: newEmployee,
      message: '遉ｾ蜩｡縺御ｽ懈・縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '遉ｾ蜩｡縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 遉ｾ蜩｡譖ｴ譁ｰ
app.put('/api/admin/employees/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { code: newCode, name, department_id } = req.body;
    
    if (!newCode || !name) {
      return res.status(200).json({ 
        ok: false, 
        error: '遉ｾ蜩｡繧ｳ繝ｼ繝峨→蜷榊燕縺ｯ蠢・医〒縺・ 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.code === code);
    if (employeeIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '遉ｾ蜩｡縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' 
      });
    }
    
    // 驛ｨ鄂ｲID縺ｮ讀懆ｨｼ
    if (department_id && !deptIndex.has(department_id)) {
      return res.status(200).json({ 
        ok: false, 
        error: '謖・ｮ壹＆繧後◆驛ｨ鄂ｲ縺悟ｭ伜惠縺励∪縺帙ｓ' 
      });
    }
    
    // 遉ｾ蜩｡繧ｳ繝ｼ繝峨・驥崎､・メ繧ｧ繝・け・郁・蛻・ｻ･螟厄ｼ・
    if (newCode !== code) {
      const existingEmployee = employees.find(e => e.code === newCode);
      if (existingEmployee) {
        return res.status(200).json({ 
          ok: false, 
          error: '蜷後§遉ｾ蜩｡繧ｳ繝ｼ繝峨・遉ｾ蜩｡縺梧里縺ｫ蟄伜惠縺励∪縺・ 
        });
      }
    }
    
    // 遉ｾ蜩｡繧呈峩譁ｰ
    employees[employeeIndex] = {
      ...employees[employeeIndex],
      code: newCode.trim(),
      name: name.trim(),
      department_id: department_id || null,
      dept: department_id ? deptIndex.get(department_id)?.name : null
    };
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.json({ 
      ok: true, 
      employee: employees[employeeIndex],
      message: '遉ｾ蜩｡縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '遉ｾ蜩｡縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 遉ｾ蜩｡蜑企勁
app.delete('/api/admin/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = parseInt(id);
    
    if (isNaN(employeeId)) {
      return res.status(200).json({ 
        ok: false, 
        error: '辟｡蜉ｹ縺ｪ遉ｾ蜩｡ID縺ｧ縺・ 
      });
    }
    
    const employeeIndex = employees.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
      return res.status(200).json({ 
        ok: false, 
        error: '遉ｾ蜩｡縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' 
      });
    }
    
    // 蜍､諤繝・・繧ｿ縺後≠繧九°繝√ぉ繝・け
    const hasAttendance = Object.values(attendanceData).some(dayData => 
      Object.values(dayData).some(empData => empData.code === employees[employeeIndex].code)
    );
    
    if (hasAttendance) {
      return res.status(200).json({ 
        ok: false, 
        error: '縺薙・遉ｾ蜩｡縺ｫ縺ｯ蜍､諤繝・・繧ｿ縺悟ｭ伜惠縺励∪縺吶ょ・縺ｫ蜍､諤繝・・繧ｿ繧貞炎髯､縺励※縺上□縺輔＞縲・ 
      });
    }
    
    // 遉ｾ蜩｡繧貞炎髯､
    employees.splice(employeeIndex, 1);
    
    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    
    res.json({ 
      ok: true, 
      message: '遉ｾ蜩｡縺悟炎髯､縺輔ｌ縺ｾ縺励◆' 
    });
  } catch (error) {
    console.error('Employee deletion error:', error);
    res.status(200).json({ 
      ok: false, 
      error: '遉ｾ蜩｡縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
    });
  }
});

// 繝槭せ繧ｿ繝ｼ・域欠螳壽律縺ｮ蜍､諤縺ｾ縺ｨ繧・ｼ・
app.get('/api/admin/master', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const sorted = [...employees].sort((a, b) => a.code.localeCompare(b.code));
  const list = sorted.map(e => {
    const key = `${date}-${e.code}`;
    const at = attendanceData[key] || {};
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '譛ｪ謇螻・)
      : (e.dept ?? '譛ｪ謇螻・);

    return {
      id: e.id,
      code: e.code,
      name: e.name,
      dept,
      department_id: e.department_id ?? null,
      clock_in: at.clock_in ?? null,
      clock_out: at.clock_out ?? null,
      status: at.clock_in ? (at.clock_out ? '騾蜍､貂医∩' : '蜃ｺ蜍､荳ｭ') : '譛ｪ蜃ｺ蜍､',
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

// 蜍､諤荳隕ｧ・域欠螳壽律・・
app.get('/api/admin/attendance', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const list = [...employees].sort((a, b) => a.code.localeCompare(b.code)).map(e => {
    const key = `${date}-${e.code}`;
    const at = attendanceData[key] || {};
    const dept = (e.department_id != null)
      ? (deptIndex.get(e.department_id)?.name ?? '譛ｪ謇螻・)
      : (e.dept ?? '譛ｪ謇螻・);
    return {
      id: e.id,
      code: e.code,
      name: e.name,
      dept,
      department_id: e.department_id ?? null,
      clock_in: at.clock_in ?? null,
      clock_out: at.clock_out ?? null,
      status: at.clock_in && at.clock_out ? '騾蜍､' : at.clock_in ? '蜃ｺ蜍､荳ｭ' : '譛ｪ蜃ｺ蜍､',
      remark: ''
    };
  });
  res.json({ ok: true, date, list });
});

// ・井ｻｻ諢擾ｼ峨ヰ繝・け繧｢繝・・縺ｮ"繝倥Ν繧ｹ"縺縺代・縺薙％縺ｧ螳檎ｵ・
app.get('/api/admin/backups/health', (_req, res) => {
  try {
    const enabled = (process.env.BACKUP_ENABLED ?? '1') !== '0';
    const intervalMinutes = parseInt(process.env.BACKUP_INTERVAL_MINUTES ?? '60', 10);
    const maxKeep = parseInt(process.env.BACKUP_MAX_KEEP ?? '24', 10);
    res.json({ ok: true, enabled, intervalMinutes, maxKeep });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// --- 繝舌ャ繧ｯ繧｢繝・・API ---

// 繝舌ャ繧ｯ繧｢繝・・菴懈・
app.post('/api/admin/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}`;

    // 迴ｾ蝨ｨ縺ｮ蜈ｨ繝・・繧ｿ繧貞叙蠕・
    const backupData = {
      id: backupId,
      timestamp,
      employees: [...employees],
      departments: [...departments],
      attendance: { ...attendanceData },
      holidays: { ...holidays },
      remarks: { ...remarksData }
    };

    // 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・
    const backupDir = path.join(DATA_DIR, '..', 'backups', backupId);
    const fs = await import('fs');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
    const backupFile = path.join(backupDir, 'backup.json');
    writeJsonAtomic(backupFile, backupData);

    // 繝舌ャ繧ｯ繧｢繝・・繝｡繧ｿ繝・・繧ｿ繧剃ｿ晏ｭ・
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
      message: '繝舌ャ繧ｯ繧｢繝・・縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆'
    });
  } catch (e) {
    console.error('Backup creation error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 繝舌ャ繧ｯ繧｢繝・・荳隕ｧ蜿門ｾ・
app.get('/api/admin/backups', (_req, res) => {
  try {
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const metadata = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };

    // 繝舌ャ繧ｯ繧｢繝・・繧呈眠縺励＞鬆・↓繧ｽ繝ｼ繝・
    const sortedBackups = metadata.backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 蜿､縺・ヰ繝・け繧｢繝・・繧定・蜍募炎髯､・域怙譁ｰ10蛟九ｒ菫晄戟・・
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

      // 繝｡繧ｿ繝・・繧ｿ繧呈峩譁ｰ
      const remainingBackups = sortedBackups.slice(0, maxKeep);
      const updatedMetadata = { backups: remainingBackups };
      fs.writeFileSync(metaFile, JSON.stringify(updatedMetadata, null, 2));

      console.log(`Cleaned up ${toDelete.length} old backups, keeping ${remainingBackups.length} latest`);
    }

    res.json({ ok: true, backups: sortedBackups.slice(0, maxKeep) });
  } catch (e) {
    console.error('Backup list error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 繝舌ャ繧ｯ繧｢繝・・隧ｳ邏ｰ蜿門ｾ・
app.get('/api/admin/backups/:backupId', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(200).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null);
    if (!backupData) {
      return res.status(200).json({ ok: false, error: 'Backup data corrupted' });
    }

    res.json({ ok: true, backup: backupData });
  } catch (e) {
    console.error('Backup detail error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 繝舌ャ繧ｯ繧｢繝・・繝励Ξ繝薙Η繝ｼ・郁ｦ九ｋ縺縺代Δ繝ｼ繝会ｼ・
app.get('/api/admin/backups/:backupId/preview', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(200).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null);
    if (!backupData) {
      return res.status(200).json({ ok: false, error: 'Backup data corrupted' });
    }

    // 繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝臥畑縺ｮ繝・・繧ｿ繧定ｿ斐☆・亥ｾｩ蜈・・縺励↑縺・ｼ・
    res.json({
      ok: true,
      preview: true,
      backup: backupData,
      message: '繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝会ｼ壹ョ繝ｼ繧ｿ縺ｯ蠕ｩ蜈・＆繧後∪縺帙ｓ'
    });
  } catch (e) {
    console.error('Backup preview error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 繝舌ャ繧ｯ繧｢繝・・縺九ｉ蠕ｩ蜈・
app.post('/api/admin/backups/:backupId/restore', (req, res) => {
  try {
    const { backupId } = req.params;
    const backupFile = path.join(DATA_DIR, '..', 'backups', backupId, 'backup.json');

    if (!existsSync(backupFile)) {
      return res.status(200).json({ ok: false, error: 'Backup not found' });
    }

    const backupData = safeReadJSON(backupFile, null) as any;
    if (!backupData) {
      return res.status(200).json({ ok: false, error: 'Backup data corrupted' });
    }

    // 迴ｾ蝨ｨ縺ｮ繝・・繧ｿ繧偵ヰ繝・け繧｢繝・・・亥ｾｩ蜈・燕縺ｮ螳牙・遲厄ｼ・
    const currentBackup = {
      employees: [...employees],
      departments: [...departments],
      attendance: { ...attendanceData },
      holidays: { ...holidays },
      remarks: { ...remarksData }
    };

    // 繝舌ャ繧ｯ繧｢繝・・繝・・繧ｿ縺ｧ蠕ｩ蜈・
    employees.length = 0;
    employees.push(...backupData.employees);
    departments.length = 0;
    departments.push(...backupData.departments);
    Object.assign(attendanceData, backupData.attendance);
    Object.assign(holidays, backupData.holidays);
    Object.assign(remarksData, backupData.remarks);

    // 繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ・
    writeJsonAtomic(EMPLOYEES_FILE, employees);
    writeJsonAtomic(DEPARTMENTS_FILE, departments);
    writeJsonAtomic(ATTENDANCE_FILE, attendanceData);
    writeJsonAtomic(HOLIDAYS_FILE, holidays);
    writeJsonAtomic(REMARKS_FILE, remarksData);

    res.json({
      ok: true,
      message: `繝舌ャ繧ｯ繧｢繝・・ ${backupId} 縺九ｉ蠕ｩ蜈・＠縺ｾ縺励◆`,
      restoredAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Backup restore error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 繝舌ャ繧ｯ繧｢繝・・蜑企勁
app.delete('/api/admin/backups/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupDir = path.join(DATA_DIR, '..', 'backups', backupId);

    if (!existsSync(backupDir)) {
      return res.status(200).json({ ok: false, error: 'Backup not found' });
    }

    // 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ繧貞炎髯､
    const fs = await import('fs');
    fs.rmSync(backupDir, { recursive: true, force: true });

    // 繝｡繧ｿ繝・・繧ｿ縺九ｉ蜑企勁
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const existingMeta = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };
    existingMeta.backups = existingMeta.backups.filter((b) => b.id !== backupId);
    writeJsonAtomic(metaFile, existingMeta);

    res.json({ ok: true, message: `繝舌ャ繧ｯ繧｢繝・・ ${backupId} 繧貞炎髯､縺励∪縺励◆` });
  } catch (e) {
    console.error('Backup delete error:', e);
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// 蜿､縺・ヰ繝・け繧｢繝・・繧呈焔蜍輔け繝ｪ繝ｼ繝ｳ繧｢繝・・
app.post('/api/admin/backups/cleanup', async (req, res) => {
  try {
    const { maxKeep = 10 } = req.body;
    const metaFile = path.join(DATA_DIR, '..', 'backups', 'backup_metadata.json');
    const metadata = safeReadJSON(metaFile, { backups: [] }) as { backups: Array<{ id: string, timestamp: string, size: number }> };

    // 繝舌ャ繧ｯ繧｢繝・・繧呈眠縺励＞鬆・↓繧ｽ繝ｼ繝・
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

    // 繝｡繧ｿ繝・・繧ｿ繧呈峩譁ｰ
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
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// --- Cursor謖・､ｺAPI ---

// Cursor謖・､ｺ螳溯｡・
app.post('/api/cursor-command', async (req, res) => {
  const { command } = req.body || {};
  
  if (!command) {
    return res.status(200).json({ 
      success: false, 
      message: '繧ｳ繝槭Φ繝峨′蠢・ｦ√〒縺・ 
    });
  }

  try {
    // 繧ｳ繝槭Φ繝牙ｮ溯｡・
    const result = await executeCursorCommand(command);
    
    res.json({ 
      success: true, 
      message: result,
      command: command,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cursor command error:', error);
    res.status(200).json({ 
      success: false, 
      message: '繧ｳ繝槭Φ繝牙ｮ溯｡後↓螟ｱ謨励＠縺ｾ縺励◆', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 繝舌ャ繧ｯ繧ｨ繝ｳ繝画欠遉ｺ螳溯｡碁未謨ｰ
async function executeCursorCommand(command: string): Promise<string> {
  console.log(`Executing backend command: ${command}`);
  
  try {
    // 繧ｳ繝槭Φ繝峨・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    const sanitizedCommand = command.trim().toLowerCase();
    
    // 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝√ぉ繝・け
    if (sanitizedCommand.includes('rm ') || sanitizedCommand.includes('del ')) {
      throw new Error('蜊ｱ髯ｺ縺ｪ繧ｳ繝槭Φ繝峨・螳溯｡後〒縺阪∪縺帙ｓ');
    }
    
    // 繧ｷ繧ｹ繝・Β謫堺ｽ懊さ繝槭Φ繝・
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
      return `繧ｳ繝槭Φ繝峨ｒ螳溯｡後＠縺ｾ縺励◆: ${command}`;
    }
  } catch (error) {
    throw new Error(`繧ｳ繝槭Φ繝牙ｮ溯｡後お繝ｩ繝ｼ: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 繧ｷ繧ｹ繝・Β繧ｹ繝・・繧ｿ繧ｹ遒ｺ隱・
async function executeSystemStatus(): Promise<string> {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const employeeCount = employees.length;
  const departmentCount = departments.length;
  const attendanceRecords = Object.keys(attendanceData).length;
  
  return `繧ｷ繧ｹ繝・Β繧ｹ繝・・繧ｿ繧ｹ:
- 遞ｼ蜒肴凾髢・ ${Math.floor(uptime / 60)}蛻・
- 繝｡繝｢繝ｪ菴ｿ逕ｨ驥・ ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB
- 遉ｾ蜩｡謨ｰ: ${employeeCount}蜷・
- 驛ｨ鄂ｲ謨ｰ: ${departmentCount}蛟・
- 蜍､諤險倬鹸: ${attendanceRecords}莉ｶ`;
}

// 繧ｷ繧ｹ繝・Β蜀崎ｵｷ蜍・
async function executeRestart(): Promise<string> {
  // 螳滄圀縺ｮ蜀崎ｵｷ蜍募・逅・・縺薙％縺ｫ螳溯｣・
  // 迴ｾ蝨ｨ縺ｯ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
  return '繧ｷ繧ｹ繝・Β蜀崎ｵｷ蜍輔ｒ螳溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
}

// 繝舌ャ繧ｯ繧｢繝・・謫堺ｽ・
async function executeBackup(command: string): Promise<string> {
  if (command === 'backup') {
    // 迴ｾ蝨ｨ縺ｮ繝舌ャ繧ｯ繧｢繝・・讖溯・繧貞他縺ｳ蜃ｺ縺・
    return '繝舌ャ繧ｯ繧｢繝・・繧貞ｮ溯｡後＠縺ｾ縺励◆';
  } else if (command === 'backup list') {
    // 繝舌ャ繧ｯ繧｢繝・・荳隕ｧ繧貞叙蠕・
    return '繝舌ャ繧ｯ繧｢繝・・荳隕ｧ繧貞叙蠕励＠縺ｾ縺励◆';
  } else {
    return '繝舌ャ繧ｯ繧｢繝・・繧ｳ繝槭Φ繝峨ｒ螳溯｡後＠縺ｾ縺励◆';
  }
}

// 繝・・繧ｿ謫堺ｽ・
async function executeDataOperation(command: string): Promise<string> {
  if (command === 'data stats') {
    return `繝・・繧ｿ邨ｱ險・
- 遉ｾ蜩｡繝・・繧ｿ: ${employees.length}莉ｶ
- 驛ｨ鄂ｲ繝・・繧ｿ: ${departments.length}莉ｶ
- 蜍､諤繝・・繧ｿ: ${Object.keys(attendanceData).length}莉ｶ
- 蛯呵・ョ繝ｼ繧ｿ: ${Object.keys(remarksData).length}莉ｶ`;
  } else if (command === 'data clean') {
    return '繝・・繧ｿ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧貞ｮ溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  } else {
    return '繝・・繧ｿ謫堺ｽ懊ｒ螳溯｡後＠縺ｾ縺励◆';
  }
}

// Git謫堺ｽ・
async function executeGitCommand(command: string): Promise<string> {
  // 螳滄圀縺ｮGit謫堺ｽ懊・縺薙％縺ｫ螳溯｣・
  // 萓・ child_process.execSync(command)
  return `Git謫堺ｽ懊ｒ螳溯｡・ ${command}`;
}

// NPM謫堺ｽ・
async function executeNpmCommand(command: string): Promise<string> {
  // 螳滄圀縺ｮNPM謫堺ｽ懊・縺薙％縺ｫ螳溯｣・
  return `NPM謫堺ｽ懊ｒ螳溯｡・ ${command}`;
}

// 繝薙Ν繝画桃菴・
async function executeBuildCommand(command: string): Promise<string> {
  if (command.includes('frontend')) {
    return '繝輔Ο繝ｳ繝医お繝ｳ繝峨ン繝ｫ繝峨ｒ螳溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  } else if (command.includes('backend')) {
    return '繝舌ャ繧ｯ繧ｨ繝ｳ繝峨ン繝ｫ繝峨ｒ螳溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  } else {
    return '繝薙Ν繝画桃菴懊ｒ螳溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  }
}

// 繝・・繝ｭ繧､謫堺ｽ・
async function executeDeployCommand(command: string): Promise<string> {
  if (command.includes('production')) {
    return '譛ｬ逡ｪ迺ｰ蠅・∈縺ｮ繝・・繝ｭ繧､繧貞ｮ溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  } else if (command.includes('staging')) {
    return '繧ｹ繝・・繧ｸ繝ｳ繧ｰ迺ｰ蠅・∈縺ｮ繝・・繝ｭ繧､繧貞ｮ溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  } else {
    return '繝・・繝ｭ繧､謫堺ｽ懊ｒ螳溯｡後＠縺ｾ縺励◆・医す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・;
  }
}

// --- 蛯呵アPI・郁ｪｭ縺ｿ譖ｸ縺搾ｼ・---

// 蛯呵・叙蠕・
app.get('/api/admin/remarks/:employeeCode/:date', (req, res) => {
  const key = `${req.params.date}-${req.params.employeeCode}`;
  res.json({ ok: true, remark: remarksData[key] || '' });
});

// 蛯呵・ｿ晏ｭ・
app.post('/api/admin/remarks', (req, res) => {
  const { employeeCode, date, remark } = req.body || {};
  if (!employeeCode || !date) return res.status(200).json({ ok: false, error: 'employeeCode and date required' });
  const key = `${date}-${employeeCode}`;
  remarksData[key] = String(remark || '');
  writeJsonAtomic(REMARKS_FILE, remarksData);
  res.json({ ok: true });
});

// --- 謇灘綾API・亥・遲会ｼ・---

// 蜃ｺ蜍､謇灘綾
app.post('/api/public/clock-in', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(200).json({ ok: false, error: 'code required' });
  const emp = employees.find(e => e.code === code);
  if (!emp) return res.status(200).json({ ok: false, error: 'Employee not found' });

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

// 蜃ｺ蜍､謇灘綾・育ｮ｡逅・畑・・
app.post('/api/attendance/checkin', (req, res) => {
  try {
    const { code, note } = req.body;
    if (!code) {
      return res.status(200).json({ ok: false, error: '遉ｾ蜩｡繧ｳ繝ｼ繝峨′蠢・ｦ√〒縺・ });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (existing.checkin) {
      return res.status(200).json({ 
        ok: false, 
        error: '譌｢縺ｫ蜃ｺ蜍､謇灘綾貂医∩縺ｧ縺・ 
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
      message: '蜃ｺ蜍､謇灘綾縺悟ｮ御ｺ・＠縺ｾ縺励◆',
      checkin: checkinTime
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(200).json({ ok: false, error: '蜃ｺ蜍､謇灘綾縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 騾蜍､謇灘綾・育ｮ｡逅・畑・・
app.post('/api/attendance/checkout', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(200).json({ ok: false, error: '遉ｾ蜩｡繧ｳ繝ｼ繝峨′蠢・ｦ√〒縺・ });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}-${code}`;
    const existing = attendanceData[key] || {};

    if (!existing.checkin) {
      return res.status(200).json({ 
        ok: false, 
        error: '蜃ｺ蜍､謇灘綾縺後＆繧後※縺・∪縺帙ｓ' 
      });
    }

    if (existing.checkout) {
      return res.status(200).json({ 
        ok: false, 
        error: '譌｢縺ｫ騾蜍､謇灘綾貂医∩縺ｧ縺・ 
      });
    }

    const now = new Date();
    const checkoutTime = now.toISOString();
    
    // 蜃ｺ蜍､譎る俣縺ｨ縺ｮ蟾ｮ繧定ｨ育ｮ・
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
      message: '騾蜍､謇灘綾縺悟ｮ御ｺ・＠縺ｾ縺励◆',
      checkout: checkoutTime,
      work_hours: workHours,
      work_minutes: remainingMinutes,
      total_minutes: workMinutes
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(200).json({ ok: false, error: '騾蜍､謇灘綾縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 騾蜍､謇灘綾
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

// ---- 髱咏噪驟堺ｿ｡・・PA・・----
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

  // 逾晄律邂｡逅・PI
  app.get('/api/admin/holidays', (req, res) => {
    try {
      res.json({ 
        ok: true, 
        holidays: holidays 
      });
    } catch (error) {
      console.error('Holidays API error:', error);
      res.status(200).json({ 
        ok: false, 
        error: '逾晄律繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' 
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
        error: '逾晄律繝√ぉ繝・け縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
      });
    }
  });

  // 騾ｱ谺｡繝ｬ繝昴・繝・PI
  app.get('/api/admin/weekly', (req, res) => {
    try {
      const { start } = req.query;
      const startDate = start ? new Date(start as string) : new Date();
      
      // 騾ｱ縺ｮ髢句ｧ区律・域怦譖懈律・峨ｒ險育ｮ・
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
      res.status(200).json({ 
        ok: false, 
        error: '騾ｱ谺｡繝ｬ繝昴・繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' 
      });
    }
  });

  // 譛亥挨蛯呵・叙蠕輸PI
  app.get('/api/admin/remarks/:employeeCode', (req, res) => {
    try {
      const { employeeCode } = req.params;
      const { month } = req.query;
      
      const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM蠖｢蠑・
      const remarks = [];
      
      // 謖・ｮ壽怦縺ｮ蛯呵・ｒ蜿門ｾ・
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
      res.status(200).json({ 
        ok: false, 
        error: '譛亥挨蛯呵・・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' 
      });
    }
  });

  // SPA縺ｮ繝ｫ繝ｼ繝・ぅ繝ｳ繧ｰ・・api 莉･螟悶・ index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(200).json({ error: 'API endpoint not implemented' });
    }
    res.sendFile(path.resolve(FRONTEND_PATH, 'index.html'));
  });
} else {
  console.warn('笞・・FRONTEND not found:', FRONTEND_PATH);
}

// ---- 襍ｷ蜍・----
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8001; // 迺ｰ蠅・､画焚縺九ｉ隱ｭ縺ｿ霎ｼ縺ｿ縲√ョ繝輔か繝ｫ繝医・8001

const server = app.listen(PORT, HOST, () => {
  console.log(`邃ｹ・・Backend server running on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

export default app;
