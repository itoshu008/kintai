import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.KINTAI_DATA_DIR || path.join(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'employees.json');

type Emp = { code: string; name: string; department_id: number; [k: string]: any };

// 全角→半角変換（全角数字・英字・ハイフンを半角に）
const z2h = (s: string) =>
  s.replace(/[０-９Ａ-Ｚａ-ｚ－]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/\s+/g, '').trim();

// コード正規化（全角半角統一・前後スペース除去）
const normCode = (s: any) => (typeof s === 'string' && z2h(s)) || '';

const read = (): Emp[] => {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
};

const save = (list: Emp[]) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), { encoding: 'utf8' });
};

export function mountAdminEmployees(app: Express) {
  // 社員一覧取得
  app.get('/api/admin/employees', (_req: Request, res: Response) => {
    try {
      const employees = read();
      res.json({ ok: true, employees });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Failed to read employees' });
    }
  });

  // 社員追加 or 上書き
  app.post('/api/admin/employees', (req: Request, res: Response) => {
    try {
      const code = normCode(req.body?.code);
      const name = String(req.body?.name ?? '').trim();
      const department_id = Number(req.body?.department_id ?? 0);

      if (!code || !name || !department_id) {
        return res.status(400).json({ ok: false, error: 'invalid-input', message: '社員コード、氏名、部署IDは必須です' });
      }

      const list = read();
      const i = list.findIndex(e => normCode(e.code) === code);

      if (i >= 0) {
        // 既存のコード
        if (String(req.query.overwrite) === 'true') {
          // 上書き更新
          list[i] = { 
            ...list[i], 
            name, 
            department_id, 
            updated_at: new Date().toISOString() 
          };
          save(list);
          return res.json({ 
            ok: true, 
            employee: list[i], 
            message: '社員を更新しました' 
          });
        }
        // 上書きなし → 409エラー
        return res.status(409).json({ 
          ok: false, 
          error: 'code-exists', 
          message: 'この社員コードは既に存在します', 
          code 
        });
      }

      // 新規作成
      const emp: Emp = { 
        code, 
        name, 
        department_id, 
        created_at: new Date().toISOString() 
      };
      list.push(emp);
      save(list);
      return res.status(201).json({ 
        ok: true, 
        employee: emp, 
        message: '社員が作成されました' 
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Failed to save employee' });
    }
  });

  // 社員コード存在チェック（UIの事前チェック用）
  app.get('/api/admin/employees/:code/exists', (req: Request, res: Response) => {
    try {
      const code = normCode(req.params.code);
      const exists = read().some(e => normCode(e.code) === code);
      res.json({ ok: true, code, exists });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Failed to check code' });
    }
  });

  // 社員更新
  app.put('/api/admin/employees/:code', (req: Request, res: Response) => {
    try {
      const code = normCode(req.params.code);
      const name = String(req.body?.name ?? '').trim();
      const department_id = Number(req.body?.department_id ?? 0);

      if (!name || !department_id) {
        return res.status(400).json({ ok: false, error: 'invalid-input' });
      }

      const list = read();
      const i = list.findIndex(e => normCode(e.code) === code);

      if (i === -1) {
        return res.status(404).json({ ok: false, error: 'employee-not-found' });
      }

      list[i] = { 
        ...list[i], 
        name, 
        department_id, 
        updated_at: new Date().toISOString() 
      };
      save(list);
      res.json({ ok: true, employee: list[i], message: '社員を更新しました' });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Failed to update employee' });
    }
  });

  // 社員削除
  app.delete('/api/admin/employees/:code', (req: Request, res: Response) => {
    try {
      const code = normCode(req.params.code);
      const list = read();
      const i = list.findIndex(e => normCode(e.code) === code);

      if (i === -1) {
        return res.status(404).json({ ok: false, error: 'employee-not-found' });
      }

      const removed = list.splice(i, 1)[0];
      save(list);
      res.json({ ok: true, message: '社員を削除しました', employee: removed });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'Failed to delete employee' });
    }
  });
}
