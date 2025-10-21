// 単一のデータディレクトリを決め打ち（環境変数優先）
const DATA_DIR = process.env.KINTAI_DATA_DIR || './data';

// ポートとホストの設定（環境変数優先・8001デフォルト）
const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';

module.exports = {
  DATA_DIR,
  PORT,
  HOST
};
