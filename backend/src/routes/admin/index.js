const { Router } = require('express');
const { readJson } = require('../../utils/dataStore.js');

const admin = Router();

// ── 必須: employees 一覧 ──
admin.get('/employees', async (req, res) => {
  console.log('🔍 /admin/employees エンドポイントが呼ばれました');
  try {
    const employees = readJson('employees.json', []);
    console.log('✅ employees データ取得成功:', employees.length, '件');
    return res.json({ ok: true, employees });
  } catch (e) {
    console.error('❌ GET /admin/employees failed:', e);
    return res.status(200).json({ ok: false, error: 'failed to load employees', detail: String(e?.message ?? e) });
  }
});

// ── 必須: master 一覧（指定日）──
admin.get('/master', async (req, res) => {
  try {
    const date = String(req.query.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(200).json({ ok: false, error: 'date=YYYY-MM-DD が必要です' });
    }

    const employees = readJson('employees.json', []);
    const attendance = readJson('attendance.json', []);
    const departments = readJson('departments.json', []);

    // 指定日の勤怠データを取得（attendanceが配列でない場合は空配列にする）
    const dayAttendance = Array.isArray(attendance) ? attendance.filter((a) => a.date === date) : [];
    
    // 社員データと勤怠データを結合
    const list = employees.map((emp) => {
      const att = dayAttendance.find((a) => a.employee_code === emp.code);
      const dept = departments.find((d) => d.id === emp.department_id);
      
      return {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        dept: dept?.name || '未設定',
        department_id: emp.department_id,
        department_name: dept?.name || '未設定',
        clock_in: att?.clock_in || null,
        clock_out: att?.clock_out || null,
        status: att?.clock_in ? (att?.clock_out ? '退勤済' : '出勤中') : '',
        remark: att?.remark || ''
      };
    });

    res.json({ ok: true, date, list });
  } catch (e) {
    console.error('GET /admin/master failed:', e);
    res.status(200).json({ ok: false, error: 'failed to load master', detail: String(e?.message ?? e) });
  }
});

admin.get('/departments', async (req, res) => {
  try {
    const departments = readJson('departments.json', []);
    return res.json({ ok: true, departments });
  } catch (e) {
    console.error('GET /admin/departments failed:', e);
    return res.status(200).json({ ok: false, error: 'failed to load departments', detail: String(e?.message ?? e) });
  }
});

module.exports = admin;
