import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from '../config';

export function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T>(name: string, fallback: T): T {
  try {
    const p = path.join(DATA_DIR, name);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return fallback; }
}

export function writeJson(name: string, data: unknown) {
  const p = path.join(DATA_DIR, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}
