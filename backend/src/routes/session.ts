import { Router } from 'express';
import crypto from 'crypto';
// import pool from '../db/mysqlPool.js'; // ← 一時的にコメントアウト

const r = Router();

// セッションテーブル（無ければ作成）
// async function ensureTable() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS sessions (
//       id VARCHAR(64) PRIMARY KEY,
//       employee_code VARCHAR(32) NOT NULL,
//       name VARCHAR(100) NOT NULL,
//       department VARCHAR(100),
//       remember_me TINYINT(1) DEFAULT 0,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
//   `);
// }
// ensureTable().catch(console.error);

// 保存（ログイン）
r.post('/', async (req, res) => {
  try {
    const { code, name, department = '未設定', rememberMe = false } = req.body || {};
    if (!code || !name) return res.json({ ok:false, error:'codeとnameは必須です' });

    const id = crypto.randomBytes(16).toString('hex');
    // await pool.query(
    //   'INSERT INTO sessions (id, employee_code, name, department, remember_me) VALUES (?, ?, ?, ?, ?)',
    //   [id, String(code), String(name), String(department), rememberMe ? 1 : 0]
    // );

    return res.json({ ok:true, data:{ sessionId:id, code, name, department, rememberMe } });
  } catch (e:any) {
    console.error('POST /api/session', e);
    return res.json({ ok:false, error:'failed to create session' });
  }
});

// 検証（復元）
r.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // const [rows]: any = await pool.query('SELECT * FROM sessions WHERE id=?', [id]);
    // if (!rows?.length) return res.json({ ok:false, error:'invalid session' });

    // const s = rows[0];
    return res.json({ ok:true, data:{
      sessionId: id, code: 'dummy', name: 'dummy',
      department: 'dummy', rememberMe: false
    }});
  } catch (e:any) {
    console.error('GET /api/session/:id', e);
    return res.json({ ok:false, error:'failed to verify session' });
  }
});

// 削除（ログアウト）
r.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // await pool.query('DELETE FROM sessions WHERE id=?', [id]);
    return res.json({ ok:true });
  } catch (e:any) {
    console.error('DELETE /api/session/:id', e);
    return res.json({ ok:false, error:'failed to delete session' });
  }
});

export default r;

