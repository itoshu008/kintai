// 単一のデータディレクトリを決め打ち（環境変数優先）
export const DATA_DIR =
  process.env.KINTAI_DATA_DIR || '/srv/kintai/data';

// ポートとホストの設定（環境変数優先・8001デフォルト）
export const PORT = Number(process.env.PORT) || 8001;
export const HOST = process.env.HOST || '0.0.0.0';
