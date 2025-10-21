// MySQL接続とクエリ実行のためのユーティリティ
import mysql from 'mysql2/promise';

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
export async function testConnection(): Promise<boolean> {
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
export async function createTables(): Promise<void> {
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
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        department_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // 勤怠テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        clock_in TIMESTAMP NULL,
        clock_out TIMESTAMP NULL,
        work_hours DECIMAL(4,2) DEFAULT 0,
        work_minutes INT DEFAULT 0,
        total_minutes INT DEFAULT 0,
        late_minutes INT DEFAULT 0,
        early_minutes INT DEFAULT 0,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attendance (employee_code, date)
      )
    `);

    // 備考テーブル
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS remarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_remark (employee_code, date)
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 部署関連のクエリ
export async function getDepartments() {
  const [rows] = await pool.execute('SELECT * FROM departments ORDER BY name');
  return rows;
}

export async function createDepartment(name: string) {
  const [result] = await pool.execute(
    'INSERT INTO departments (name) VALUES (?)',
    [name]
  );
  return result;
}

export async function updateDepartment(id: number, name: string) {
  const [result] = await pool.execute(
    'UPDATE departments SET name = ? WHERE id = ?',
    [name, id]
  );
  return result;
}

export async function deleteDepartment(id: number) {
  const [result] = await pool.execute('DELETE FROM departments WHERE id = ?', [id]);
  return result;
}

// 社員関連のクエリ
export async function getEmployees() {
  const [rows] = await pool.execute(`
    SELECT e.*, d.name as dept_name 
    FROM employees e 
    LEFT JOIN departments d ON e.department_id = d.id 
    WHERE e.is_active = TRUE 
    ORDER BY e.name
  `);
  return rows;
}

export async function createEmployee(code: string, name: string, department_id?: number) {
  const [result] = await pool.execute(
    'INSERT INTO employees (code, name, department_id) VALUES (?, ?, ?)',
    [code, name, department_id || null]
  );
  return result;
}

export async function updateEmployee(originalCode: string, data: { code: string; name: string; department_id?: number }) {
  const [result] = await pool.execute(
    'UPDATE employees SET code = ?, name = ?, department_id = ? WHERE code = ?',
    [data.code, data.name, data.department_id || null, originalCode]
  );
  return result;
}

export async function deleteEmployee(code: string) {
  const [result] = await pool.execute('UPDATE employees SET is_active = FALSE WHERE code = ?', [code]);
  return result;
}

// 勤怠関連のクエリ
export async function getAttendance(date?: string) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.execute(`
    SELECT a.*, e.name, d.name as dept_name
    FROM attendance a
    LEFT JOIN employees e ON a.employee_code = e.code
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.date = ? AND e.is_active = TRUE
    ORDER BY e.name
  `, [targetDate]);
  return rows;
}

export async function saveAttendance(employeeCode: string, date: string, data: any) {
  const [result] = await pool.execute(`
    INSERT INTO attendance (employee_code, date, clock_in, clock_out, work_hours, work_minutes, total_minutes, late_minutes, early_minutes, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  `, [
    employeeCode, date, data.clock_in, data.clock_out,
    data.work_hours, data.work_minutes, data.total_minutes,
    data.late_minutes, data.early_minutes, data.remark
  ]);
  return result;
}

// 備考関連のクエリ
export async function getRemark(employeeCode: string, date: string) {
  const [rows] = await pool.execute(
    'SELECT remark FROM remarks WHERE employee_code = ? AND date = ?',
    [employeeCode, date]
  );
  return rows[0] || { remark: '' };
}

export async function saveRemark(employeeCode: string, date: string, remark: string) {
  const [result] = await pool.execute(`
    INSERT INTO remarks (employee_code, date, remark)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
    remark = VALUES(remark),
    updated_at = CURRENT_TIMESTAMP
  `, [employeeCode, date, remark]);
  return result;
}

export async function getRemarks(employeeCode: string, month: string) {
  const startDate = month + '-01';
  const endDate = month + '-31';
  const [rows] = await pool.execute(`
    SELECT date, remark FROM remarks 
    WHERE employee_code = ? AND date BETWEEN ? AND ?
    ORDER BY date
  `, [employeeCode, startDate, endDate]);
  return rows;
}

// 接続プールを閉じる（アプリケーション終了時）
export async function closePool() {
  await pool.end();
}

export default pool;
