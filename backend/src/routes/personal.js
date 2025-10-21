const { Router } = require('express');
const { readJson } = require('../utils/dataStore');

const r = Router();

// 全角→半角, 余分な空白除去, 大小統一など
function normCode(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toUpperCase();
}
function normName(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim();
}

r.post('/login-verify', async (req, res) => {
  try {
    const rawCode = String(req.body?.code ?? '');
    const rawName = String(req.body?.name ?? '');
    if (!rawCode || !rawName) {
      return res.json({ ok: false, error: 'code と name は必須です' });
    }

    const codeN = normCode(rawCode);
    const nameN = normName(rawName);

    // コードはゼロ埋めゆらぎに対応（3〜6桁程度を想定）
    const variants = new Set([
      codeN,
      codeN.padStart(3, '0'),
      codeN.padStart(4, '0'),
      codeN.padStart(5, '0'),
      codeN.padStart(6, '0'),
    ]);

    // JSONファイルから社員データを取得
    const employees = readJson('employees.json', []);
    const departments = readJson('departments.json', []);
    
    // 候補コードに一致する社員を検索
    const rows = employees.filter(emp => {
      const empCode = normCode(emp.code);
      return variants.has(empCode);
    }).map(emp => {
      const dept = departments.find(d => d.id === emp.department_id);
      return {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        is_active: emp.is_active !== false, // デフォルトでtrue
        department: dept?.name || '未設定'
      };
    });

    // 簡素化された照合ロジック
    const hit = (rows || []).find((r) => {
      const c = normCode(r.code);
      const n = normName(r.name);
      console.log('照合チェック:', { 
        inputCode: codeN, 
        inputName: nameN, 
        dbCode: c, 
        dbName: n,
        codeMatch: c === codeN || variants.has(c),
        nameMatch: n === nameN
      });
      return (c === codeN || variants.has(c)) && n === nameN;
    });

    if (!hit) {
      return res.json({
        ok: false,
        error: '社員コードまたは氏名が一致しません',
        candidates: rows?.map((r) => ({ code: r.code, name: r.name })) ?? [],
        debug: {
          inputCode: rawCode,
          inputName: rawName,
          normalizedCode: codeN,
          normalizedName: nameN,
          variants: Array.from(variants),
          foundEmployees: rows?.length || 0
        }
      });
    }

    // セッションIDは簡易発行（必要ならDB保存のセッションに置換）
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    return res.json({
      ok: true,
      data: {
        sessionId,
        code: hit.code,
        name: hit.name,
        department: hit.department,
        rememberMe: !!req.body?.rememberMe,
      },
    });
  } catch (e) {
    console.error('POST /api/personal/login-verify', e);
    return res.json({ ok: false, error: '照合中にエラーが発生しました' });
  }
});

module.exports = r;
