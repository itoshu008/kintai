#!/bin/bash
# ==== 0) 変数 ====
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="$APP_DIR/backend"
PM2_APP="kintai-api"
export PM2_HOME="/home/itoshu/.pm2"

set -Eeuo pipefail

# ==== 1) 依存の整備：dotenv を本番依存(dependencies)に ====
cd "$BACKEND_DIR"
npm install --no-audit --no-fund

# ==== 2) ビルド → 直起動で "listening" を確認（ここでコケたらログが出る） ====
npm run build
# 直起動テスト（成功なら listening を出して即終了）
node dist/server.js & pid=$!
sleep 1 || true
if ps -p "$pid" >/dev/null 2>&1; then
  kill "$pid" || true
fi

# ==== 3) PM2：名前で再起動（なければ起動） → 保存 ====
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  pm2 start "$BACKEND_DIR/pm2.config.cjs" --only "$PM2_APP"
fi
pm2 save

# ==== 4) 数字で最終確認 ====
echo "---- LISTEN on 8001 ----"
ss -lntp | grep ':8001' || sudo lsof -iTCP:8001 -sTCP:LISTEN -Pn || echo "no listener on 8001"
echo "---- HEALTH ----"
curl -fsS http://127.0.0.1:8001/api/admin/health || echo "health NG"
echo "---- LOG TAIL ----"
pm2 logs "$PM2_APP" --lines 80 --timestamp --err | tail -n +1 || true
