const { Router } = require('express');
const pool = require('../db/mysqlPool');
const admin = Router();

// /api/admin/employees  一覧
admin.get('/employees', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id, e.code, e.name, e.department_id, e.is_active,
             COALESCE(d.name,'未設定') AS dept_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.is_active = 1
       ORDER BY e.name
    `);
    res.json({ ok: true, employees: rows });
  } catch (e) { 
    console.error('GET /admin/employees', e);
    res.status(200).json({ ok: false, error: 'failed to load employees' });
  }
});

// /api/admin/master?date=YYYY-MM-DD
admin.get('/master', async (req, res) => {
  try {
    const date = String(req.query.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(200).json({ ok: false, error: 'date=YYYY-MM-DD が必要です' });
    }
    const [rows] = await pool.query(`
      SELECT e.id, e.code, e.name, COALESCE(d.name,'未設定') AS dept,
             a.clock_in AS checkin, a.clock_out AS checkout,
             a.total_minutes, a.late_minutes AS late, a.remark
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance  a ON a.employee_code = e.code AND a.date = ?
       WHERE e.is_active = 1
       ORDER BY e.name
    `, [date]);
    res.json({ ok: true, date, list: rows || [] });
  } catch (e) { 
    console.error('GET /admin/master', e);
    res.status(200).json({ ok: false, error: 'failed to load master' });
  }
});

module.exports = admin;
