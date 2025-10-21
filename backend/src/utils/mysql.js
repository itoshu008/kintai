// MySQL接続とクエリ実行のためのユーティリティ
const mysql = require('mysql2/promise');

// データベース接続設定
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'itoshu',
  password: process.env.DB_PASSWORD || 'zatint_6487',
  database: process.env.DB_NAME || 'kintai',
  charset: 'utf8mb4',
  timezone: '+09:00'
};

// 接続プールを作成
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// データベース接続テスト
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// テーブル作成（初回セットアップ用）
async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // 部署テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 社員テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        department_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )
    `);

    // 勤怠テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(32) NOT NULL,
        date DATE NOT NULL,
        clock_in TIME,
        clock_out TIME,
        work_hours DECIMAL(4,2) DEFAULT 0,
        work_minutes INT DEFAULT 0,
        total_minutes INT DEFAULT 0,
        late_minutes INT DEFAULT 0,
        early_minutes INT DEFAULT 0,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_date (employee_code, date),
        FOREIGN KEY (employee_code) REFERENCES employees(code) ON DELETE CASCADE
      )
    `);

    // 備考テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS remarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(32) NOT NULL,
        date DATE NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_employee_date (employee_code, date),
        FOREIGN KEY (employee_code) REFERENCES employees(code) ON DELETE CASCADE
      )
    `);

    console.log('✅ データベーステーブル作成完了');
  } finally {
    connection.release();
  }
}

// ============================================================================
// 部署管理
// ============================================================================

async function getDepartments() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM departments ORDER BY id');
    return rows;
  } finally {
    connection.release();
  }
}

async function createDepartment(name) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO departments (name) VALUES (?)',
      [name]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function updateDepartment(id, name) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'UPDATE departments SET name = ? WHERE id = ?',
      [name, id]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function deleteDepartment(id) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );
    return result;
  } finally {
    connection.release();
  }
}

// ============================================================================
// 社員管理
// ============================================================================

async function getEmployees() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(`
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      ORDER BY e.id
    `);
    return rows;
  } finally {
    connection.release();
  }
}

async function createEmployee(code, name, department_id) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'INSERT INTO employees (code, name, department_id) VALUES (?, ?, ?)',
      [code, name, department_id]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function updateEmployee(originalCode, { code, name, department_id }) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'UPDATE employees SET code = ?, name = ?, department_id = ? WHERE code = ?',
      [code, name, department_id, originalCode]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function deleteEmployee(code) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'DELETE FROM employees WHERE code = ?',
      [code]
    );
    return result;
  } finally {
    connection.release();
  }
}

// ============================================================================
// 勤怠管理
// ============================================================================

async function getAttendance(date) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(`
      SELECT a.*, e.name as employee_name, d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_code = e.code
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.date = ?
      ORDER BY e.name
    `, [date]);
    return rows;
  } finally {
    connection.release();
  }
}

async function saveAttendance(employee_code, date, attendanceData) {
  const connection = await pool.getConnection();
  try {
    const { clock_in, clock_out, work_hours, work_minutes, total_minutes, late_minutes, early_minutes, remark } = attendanceData;
    
    const [result] = await connection.execute(`
      INSERT INTO attendance (
        employee_code, date, clock_in, clock_out, work_hours, work_minutes, 
        total_minutes, late_minutes, early_minutes, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        clock_in = VALUES(clock_in),
        clock_out = VALUES(clock_out),
        work_hours = VALUES(work_hours),
        work_minutes = VALUES(work_minutes),
        total_minutes = VALUES(total_minutes),
        late_minutes = VALUES(late_minutes),
        early_minutes = VALUES(early_minutes),
        remark = VALUES(remark),
        updated_at = CURRENT_TIMESTAMP
    `, [employee_code, date, clock_in, clock_out, work_hours, work_minutes, total_minutes, late_minutes, early_minutes, remark]);
    
    return result;
  } finally {
    connection.release();
  }
}

// ============================================================================
// 備考管理
// ============================================================================

async function getRemark(employee_code, date) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT remark FROM remarks WHERE employee_code = ? AND date = ?',
      [employee_code, date]
    );
    return { remark: rows[0]?.remark || '' };
  } finally {
    connection.release();
  }
}

async function saveRemark(employee_code, date, remark) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(`
      INSERT INTO remarks (employee_code, date, remark) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        remark = VALUES(remark),
        updated_at = CURRENT_TIMESTAMP
    `, [employee_code, date, remark]);
    return result;
  } finally {
    connection.release();
  }
}

async function getRemarks(employee_code, month) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT date, remark FROM remarks WHERE employee_code = ? AND DATE_FORMAT(date, "%Y-%m") = ? ORDER BY date',
      [employee_code, month]
    );
    return rows;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  createTables,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  saveAttendance,
  getRemark,
  saveRemark,
  getRemarks
};
