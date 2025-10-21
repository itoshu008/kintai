// MySQL用のAPIルート
const { Router } = require('express');
const { 
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAttendance, saveAttendance, getRemark, saveRemark, getRemarks,
  testConnection, createTables
} = require('../../utils/mysql');

const mysqlAdmin = Router();

// データベース初期化
mysqlAdmin.post('/init', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ ok: false, error: 'Database connection failed' });
    }
    
    await createTables();
    res.json({ ok: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ ok: false, error: 'Failed to initialize database' });
  }
});

// ヘルスチェック（データベース接続確認付き）
mysqlAdmin.get('/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      ok: true, 
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Health check failed' });
  }
});

// ============================================================================
// 部署管理 API
// ============================================================================

// 部署一覧取得
mysqlAdmin.get('/departments', async (req, res) => {
  try {
    const departments = await getDepartments();
    res.json({ ok: true, departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ ok: false, error: 'Failed to read departments' });
  }
});

// 部署追加
mysqlAdmin.post('/departments', async (req, res) => {
  try {
    const name = (req.body?.name ?? '').toString().trim();
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    
    const result = await createDepartment(name);
    const department = { id: result.insertId, name, created_at: new Date().toISOString() };
    
    res.status(201).json({ ok: true, department });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ ok: false, error: 'Failed to create department' });
  }
});

// 部署更新
mysqlAdmin.put('/departments/:id', async (req, res) => {
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
mysqlAdmin.delete('/departments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await deleteDepartment(id);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Department not found' });
    }
    
    res.json({ ok: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete department' });
  }
});

// ============================================================================
// 社員管理 API
// ============================================================================

// 社員一覧取得
mysqlAdmin.get('/employees', async (req, res) => {
  try {
    const employees = await getEmployees();
    res.json({ ok: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ ok: false, error: 'Failed to read employees' });
  }
});

// 社員追加
mysqlAdmin.post('/employees', async (req, res) => {
  try {
    const { code, name, department_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({ ok: false, error: 'code and name required' });
    }
    
    const result = await createEmployee(code, name, department_id);
    const employee = { 
      id: result.insertId, 
      code, 
      name, 
      department_id: department_id || null,
      created_at: new Date().toISOString() 
    };
    
    res.status(201).json({ ok: true, employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ ok: false, error: 'Employee code already exists' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to create employee' });
    }
  }
});

// 社員更新
mysqlAdmin.put('/employees/:code', async (req, res) => {
  try {
    const originalCode = req.params.code;
    const { code, name, department_id } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ ok: false, error: 'code and name required' });
    }
    
    const result = await updateEmployee(originalCode, { code, name, department_id });
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Employee not found' });
    }
    
    const employee = { 
      code, 
      name, 
      department_id: department_id || null,
      updated_at: new Date().toISOString() 
    };
    
    res.json({ ok: true, employee });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ ok: false, error: 'Failed to update employee' });
  }
});

// 社員削除
mysqlAdmin.delete('/employees/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const result = await deleteEmployee(code);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Employee not found' });
    }
    
    res.json({ ok: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete employee' });
  }
});

// ============================================================================
// 勤怠管理 API
// ============================================================================

// マスターデータ取得
mysqlAdmin.get('/master', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const attendance = await getAttendance(date);
    const departments = await getDepartments();
    const employees = await getEmployees();
    
    res.json({ 
      ok: true, 
      date, 
      employees, 
      departments, 
      attendance,
      list: employees // 互換性のため
    });
  } catch (error) {
    console.error('Error fetching master data:', error);
    res.status(500).json({ ok: false, error: 'Failed to read master data' });
  }
});

// 勤怠データ保存
mysqlAdmin.post('/attendance', async (req, res) => {
  try {
    const { employee_code, date, clock_in, clock_out, work_hours, work_minutes, total_minutes, late_minutes, early_minutes, remark } = req.body;
    
    if (!employee_code || !date) {
      return res.status(400).json({ ok: false, error: 'employee_code and date required' });
    }
    
    const result = await saveAttendance(employee_code, date, {
      clock_in, clock_out, work_hours, work_minutes, total_minutes, late_minutes, early_minutes, remark
    });
    
    res.json({ ok: true, message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ ok: false, error: 'Failed to save attendance' });
  }
});

// ============================================================================
// 備考管理 API
// ============================================================================

// 備考取得
mysqlAdmin.get('/remarks/:employeeCode/:date', async (req, res) => {
  try {
    const { employeeCode, date } = req.params;
    const result = await getRemark(employeeCode, date);
    
    res.json({ ok: true, remark: result.remark });
  } catch (error) {
    console.error('Error getting remark:', error);
    res.status(500).json({ ok: false, error: 'Failed to get remark' });
  }
});

// 備考保存
mysqlAdmin.post('/remarks', async (req, res) => {
  try {
    const { employeeCode, date, remark } = req.body;
    
    if (!employeeCode || !date) {
      return res.status(400).json({ ok: false, error: 'employeeCode and date required' });
    }
    
    await saveRemark(employeeCode, date, remark || '');
    res.json({ ok: true, message: 'Remark saved successfully' });
  } catch (error) {
    console.error('Error saving remark:', error);
    res.status(500).json({ ok: false, error: 'Failed to save remark' });
  }
});

// 月別備考取得
mysqlAdmin.get('/remarks/:employeeCode', async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    
    const remarks = await getRemarks(employeeCode, month);
    res.json({ ok: true, remarks });
  } catch (error) {
    console.error('Error getting remarks:', error);
    res.status(500).json({ ok: false, error: 'Failed to get remarks' });
  }
});

module.exports = { mysqlAdmin };
