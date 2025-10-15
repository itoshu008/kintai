#!/bin/bash
# 再ビルド → PM2 再起動 → ポート/ヘルス確認

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
PM2_APP="kintai-api"

echo "🔧 ESM拡張子修正後の再ビルド・再起動"
echo "===================================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
set -Eeuo pipefail
cd \"'$BACKEND_DIR'\"

npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm run build
npm prune --omit=dev

if pm2 describe \"'$PM2_APP'\" >/dev/null 2>&1; then
  pm2 restart \"'$PM2_APP'\" --update-env
else
  pm2 start \"'$BACKEND_DIR'/pm2.config.cjs\" --only \"'$PM2_APP'\"   # pm2.config.cjs は env/ログ/exec_mode 設定済み想定
fi
pm2 save

# 非ストリームでログ確認
ERR_LOG=$(pm2 info \"'$PM2_APP'\" | awk -F\": \" \"/error log path/ {print \$2}\")
OUT_LOG=$(pm2 info \"'$PM2_APP'\" | awk -F\": \" \"/out log path/ {print \$2}\")
echo \"--- ERR LOG ---\"; [ -f \"$ERR_LOG\" ] && tail -n 200 \"$ERR_LOG\" || echo no-err-log
echo \"--- OUT LOG ---\"; [ -f \"$OUT_LOG\" ] && tail -n 120 \"$OUT_LOG\" || echo no-out-log

# ポート/ヘルス
ss -lntp | grep '\'':8001'\'' || { echo '\''listen NG :8001'\''; exit 2; }
curl -fsS http://127.0.0.1:8001/api/admin/health || { echo '\''health NG'\''; exit 3; }
echo '\''✅ backend up on :8001 & health OK'\''
"'
