// backend/src/routes/admin/index.ts
import { Router } from 'express';
import { readJson, writeJson } from '../../utils/dataStore';
import { 
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAttendance, saveAttendance, getRemark, saveRemark, getRemarks,
  testConnection, createTables
} from '../../utils/mysql';

export const admin = Router();

// 既存: ヘルス
admin.get('/health', (_req, res) => res.json({ ok: true }));

// ============================================================================
// 部署管理 API
// ============================================================================

// 部署一覧取得（JSONファイルベース）
admin.get('/departments', (_req, res) => {
  try {
    const departments = readJson('departments.json', []);
    res.json({ ok: true, departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(200).json({ ok: false, error: 'Failed to read departments' });
  }
});

// 部署追加（JSONファイルベースの安全な実装）
admin.post('/departments', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(200).json({ ok: false, error: 'name is required' });
    }

    // 既存の部署データを読み込み
    const departments = readJson('departments.json', []);
    
    // 重複チェック
    if (departments.some((d: any) => d.name === name)) {
      return res.status(200).json({ ok: false, error: 'duplicate department' });
    }

    // 新しいIDを生成
    const id = departments.length ? Math.max(...departments.map((d: any) => d.id || 0)) + 1 : 1;
    
    // 新しい部署を追加
    const newDepartment = { 
      id, 
      name, 
      created_at: new Date().toISOString() 
    };
    departments.push(newDepartment);

    // ファイルに保存
    writeJson('departments.json', departments);
    
    console.log(`✅ 部署追加成功: ${name} (ID: ${id})`);
    return res.status(200).json({ ok: true, department: newDepartment });
  } catch (error) {
    console.error('POST /admin/departments failed:', error);
    return res.status(200).json({ ok: false, error: 'Failed to create department' });
  }
});

// 部署更新
admin.put('/departments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = (req.body?.name ?? '').toString().trim();
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    
    const result = await updateDepartment(id, name);
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Department not found' });
    }
    
    const department = { id, name, updated_at: new Date().toISOString() };
    res.json({ ok: true, department });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ ok: false, error: 'Failed to update department' });
  }
});

// 部署削除
admin.delete('/departments/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const departments = readJson('departments.json', []);
    const index = departments.findIndex((d: any) => d.id === id);
    if (index === -1) return res.status(404).json({ ok: false, error: 'department not found' });
    
    const deleted = departments.splice(index, 1)[0];
    writeJson('departments.json', departments);
    
    res.json({ ok: true, item: deleted });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to delete department' });
  }
});

// ============================================================================
// 社員管理 API
// ============================================================================

// 社員一覧取得
admin.get('/employees', (_req, res) => {
  try {
    const employees = readJson('employees.json', []);
    res.json({ ok: true, employees });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to read employees' });
  }
});

// 社員追加
admin.post('/employees', (req, res) => {
  try {
    const { code, name, department_id } = req.body;
    if (!code || !name || !department_id) {
      return res.status(400).json({ ok: false, error: 'code, name, and department_id are required' });
    }
    
    const employees = readJson('employees.json', []);
    const existingIndex = employees.findIndex((e: any) => e.code === code);
    
    if (existingIndex >= 0) {
      if (req.query.overwrite === 'true') {
        // 上書き更新
        employees[existingIndex] = { 
          ...employees[existingIndex], 
          name, 
          department_id, 
          updated_at: new Date().toISOString() 
        };
        writeJson('employees.json', employees);
        return res.json({ ok: true, employee: employees[existingIndex] });
      } else {
        return res.status(409).json({ ok: false, error: 'code already exists' });
      }
    }
    
    // 新規作成
    const employee = { 
      code, 
      name, 
      department_id, 
      created_at: new Date().toISOString() 
    };
    employees.push(employee);
    writeJson('employees.json', employees);
    
    res.status(201).json({ ok: true, employee });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to create employee' });
  }
});

// 社員更新
admin.put('/employees/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { name, department_id } = req.body;
    
    if (!name || !department_id) {
      return res.status(400).json({ ok: false, error: 'name and department_id are required' });
    }
    
    const employees = readJson('employees.json', []);
    const index = employees.findIndex((e: any) => e.code === code);
    if (index === -1) return res.status(404).json({ ok: false, error: 'employee not found' });
    
    employees[index] = { 
      ...employees[index], 
      name, 
      department_id, 
      updated_at: new Date().toISOString() 
    };
    writeJson('employees.json', employees);
    
    res.json({ ok: true, employee: employees[index] });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to update employee' });
  }
});

// 社員削除
admin.delete('/employees/:code', (req, res) => {
  try {
    const { code } = req.params;
    const employees = readJson('employees.json', []);
    const index = employees.findIndex((e: any) => e.code === code);
    if (index === -1) return res.status(404).json({ ok: false, error: 'employee not found' });
    
    const deleted = employees.splice(index, 1)[0];
    writeJson('employees.json', employees);
    
    res.json({ ok: true, employee: deleted });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to delete employee' });
  }
});

// ============================================================================
// 勤怠管理 API
// ============================================================================

// 出勤打刻
admin.post('/clock/in', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, error: 'code is required' });
    
    const attendance = readJson('attendance.json', []);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    
    // 既存の記録を探す
    const existingIndex = attendance.findIndex((a: any) => a.code === code && a.date === today);
    
    if (existingIndex >= 0) {
      // 既存の記録を更新
      attendance[existingIndex].clock_in = now;
      attendance[existingIndex].updated_at = now;
    } else {
      // 新規作成
      attendance.push({
        code,
        date: today,
        clock_in: now,
        clock_out: null,
        created_at: now
      });
    }
    
    writeJson('attendance.json', attendance);
    res.json({ ok: true, message: '出勤を記録しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to record clock in' });
  }
});

// 退勤打刻
admin.post('/clock/out', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, error: 'code is required' });
    
    const attendance = readJson('attendance.json', []);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    
    // 既存の記録を探す
    const existingIndex = attendance.findIndex((a: any) => a.code === code && a.date === today);
    
    if (existingIndex >= 0) {
      // 既存の記録を更新
      attendance[existingIndex].clock_out = now;
      attendance[existingIndex].updated_at = now;
    } else {
      // 新規作成（出勤なしで退勤のみ）
      attendance.push({
        code,
        date: today,
        clock_in: null,
        clock_out: now,
        created_at: now
      });
    }
    
    writeJson('attendance.json', attendance);
    res.json({ ok: true, message: '退勤を記録しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to record clock out' });
  }
});

// 勤怠時間修正
admin.put('/attendance/update', (req, res) => {
  try {
    const { code, date, clock_in, clock_out } = req.body;
    if (!code || !date) return res.status(400).json({ ok: false, error: 'code and date are required' });
    
    const attendance = readJson('attendance.json', []);
    const existingIndex = attendance.findIndex((a: any) => a.code === code && a.date === date);
    
    if (existingIndex >= 0) {
      // 既存の記録を更新
      attendance[existingIndex] = {
        ...attendance[existingIndex],
        clock_in,
        clock_out,
        updated_at: new Date().toISOString()
      };
    } else {
      // 新規作成
      attendance.push({
        code,
        date,
        clock_in,
        clock_out,
        created_at: new Date().toISOString()
      });
    }
    
    writeJson('attendance.json', attendance);
    res.json({ ok: true, message: '勤怠を更新しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to update attendance' });
  }
});

// ============================================================================
// 備考管理 API
// ============================================================================

// 備考保存
admin.post('/remarks', (req, res) => {
  try {
    const { employeeCode: code, date, remark } = req.body;
    if (!code || !date) return res.status(400).json({ ok: false, error: 'employeeCode and date are required' });
    
    const remarks = readJson('remarks.json', []);
    const existingIndex = remarks.findIndex((r: any) => r.code === code && r.date === date);
    
    if (existingIndex >= 0) {
      // 既存の記録を更新
      remarks[existingIndex] = {
        ...remarks[existingIndex],
        remark,
        updated_at: new Date().toISOString()
      };
    } else {
      // 新規作成
      remarks.push({
        code,
        date,
        remark,
        created_at: new Date().toISOString()
      });
    }
    
    writeJson('remarks.json', remarks);
    res.json({ ok: true, message: '備考を保存しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to save remark' });
  }
});

// ============================================================================
// マスターデータ API
// ============================================================================

// マスターデータ取得
admin.get('/master', (req, res) => {
  try {
    const date = String(req.query.date ?? '');
    const employees = readJson('employees.json', []);
    const departments = readJson('departments.json', []);
    const attendance = readJson('attendance.json', []);
    const remarks = readJson('remarks.json', []);
    
    res.json({ 
      ok: true, 
      date, 
      employees, 
      departments, 
      attendance, 
      remarks,
      list: employees
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to read master data' });
  }
});

// ============================================================================
// バックアップ管理 API
// ============================================================================

// バックアップ一覧取得
admin.get('/backups', (_req, res) => {
  try {
    const backups = readJson('backup_metadata.json', []);
    res.json({ ok: true, backups });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to read backups' });
  }
});

// バックアップ作成
admin.post('/backups/create', (_req, res) => {
  try {
    const backupId = `backup_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // 全データをバックアップ
    const backup = {
      id: backupId,
      timestamp,
      employees: readJson('employees.json', []),
      departments: readJson('departments.json', []),
      attendance: readJson('attendance.json', []),
      remarks: readJson('remarks.json', [])
    };
    
    // バックアップファイルに保存
    writeJson(`backups/${backupId}.json`, backup);
    
    // メタデータを更新
    const metadata = readJson('backup_metadata.json', []);
    metadata.push({ id: backupId, timestamp, name: `Backup ${timestamp.slice(0, 19)}` });
    writeJson('backup_metadata.json', metadata);
    
    res.json({ ok: true, backupId, message: 'バックアップを作成しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to create backup' });
  }
});

// バックアップ削除
admin.delete('/backups/:name', (req, res) => {
  try {
    const { name } = req.params;
    const metadata = readJson('backup_metadata.json', []);
    const index = metadata.findIndex((b: any) => b.id === name);
    
    if (index === -1) return res.status(404).json({ ok: false, error: 'backup not found' });
    
    metadata.splice(index, 1);
    writeJson('backup_metadata.json', metadata);
    
    res.json({ ok: true, message: 'バックアップを削除しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to delete backup' });
  }
});

// バックアッププレビュー
admin.get('/backups/:id/preview', (req, res) => {
  try {
    const { id } = req.params;
    const backup = readJson(`backups/${id}.json`, null);
    
    if (!backup) return res.status(404).json({ ok: false, error: 'backup not found' });
    
    res.json({ ok: true, backup });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to read backup' });
  }
});

// バックアップ復元
admin.post('/backups/restore', (req, res) => {
  try {
    const { backup_id } = req.body;
    if (!backup_id) return res.status(400).json({ ok: false, error: 'backup_id is required' });
    
    const backup = readJson(`backups/${backup_id}.json`, null);
    if (!backup) return res.status(404).json({ ok: false, error: 'backup not found' });
    
    // データを復元
    writeJson('employees.json', backup.employees || []);
    writeJson('departments.json', backup.departments || []);
    writeJson('attendance.json', backup.attendance || []);
    writeJson('remarks.json', backup.remarks || []);
    
    res.json({ ok: true, message: 'バックアップを復元しました' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to restore backup' });
  }
});

export default admin;
