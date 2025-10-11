import { writeFileSync, renameSync } from 'fs';

export function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  renameSync(tmp, file); // 同一FSなら実質アトミック
}


