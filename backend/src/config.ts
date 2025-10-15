// 単一のデータディレクトリを決め打ち（環境変数優先）
export const DATA_DIR =
  process.env.KINTAI_DATA_DIR || '/srv/kintai/data';
