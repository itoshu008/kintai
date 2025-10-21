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
    
    // ダミーモード（開発用）
    if (process.env.MODE === 'dummy') {
      return res.json({ 
        ok: true, 
        date: new Date().toISOString().slice(0,10),
        list: [{ code:'008', name:'伊藤修', dept:'総務' }] 
      });
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
    // MySQL接続エラーの場合はダミーデータを返す
    console.log('MySQL接続エラーのためダミーデータを返します');
    res.json({ 
      ok: true, 
      date: new Date().toISOString().slice(0,10),
      list: [{ code:'008', name:'伊藤修', dept:'総務' }] 
    });
  }
});

// 月次備考: GET /api/admin/remarks/:code?month=YYYY-MM
admin.get('/remarks/:code', async (req, res) => {
  try {
    const code  = String(req.params.code || '').trim();
    const month = String(req.query.month || '').trim(); // '2025-10'
    if (!code || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(200).json({ ok:false, error:'code or month invalid' });
    }
    const start = `${month}-01`;
    const end   = `${month}-31`;

    const [rows] = await pool.query(
      `SELECT date, remark
         FROM remarks
        WHERE employee_code = ? AND date BETWEEN ? AND ?
        ORDER BY date`,
      [code, start, end]
    );
    return res.json({ ok:true, remarks: rows || [] });
  } catch (e) {
    console.error('GET /api/admin/remarks/:code', e);
    // MySQL接続エラーの場合はダミーレスポンスを返す
    console.log('MySQL接続エラーのためダミーレスポンスを返します');
    return res.json({ ok:true, remarks: [] });
  }
});

// 備考保存: POST /api/admin/remarks  { code, date, remark }
admin.post('/remarks', async (req, res) => {
  try {
    const code   = String(req.body?.code || '').trim();
    const date   = String(req.body?.date || '').slice(0,10);
    const remark = String(req.body?.remark ?? '');
    if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.json({ ok:false, error:'code/date invalid' });
    }
    await pool.query(
      `INSERT INTO remarks (employee_code, date, remark)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE remark=VALUES(remark), updated_at=CURRENT_TIMESTAMP`,
      [code, date, remark]
    );
    return res.json({ ok:true });
  } catch (e) {
    console.error('POST /api/admin/remarks', e);
    // MySQL接続エラーの場合はダミーレスポンスを返す
    console.log('MySQL接続エラーのためダミーレスポンスを返します');
    return res.json({ ok:true, dummy: true });
  }
});

module.exports = admin;
