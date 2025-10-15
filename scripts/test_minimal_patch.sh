#!/bin/bash
# ② ビルド → 直実行で起動確認 → PM2起動 → ポート/ヘルス検証

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"

echo "🔧 最小恒久パッチのテスト実行"
echo "============================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
set -Eeuo pipefail
export PM2_HOME=/home/$BUILD_USER/.pm2
cd \"'$BACKEND_DIR'\"

# ビルド（lockズレ時は install フォールバック）
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm run build
npm prune --omit=dev

# 直実行で 0.0.0.0:8001 まで行くか確認（8秒）
export HOST=0.0.0.0 PORT=8001
(timeout 8s node dist/server.js &) ; sleep 1 ; ss -lntp | grep '\'':8001'\'' || echo no-listen
pkill -f '\''node dist/server.js'\'' || true

# PM2（fork）で起動 → ログ → ポート/ヘルス
pm2 delete kintai-api || true
pm2 start \"'$BACKEND_DIR'/pm2.config.cjs\" --only kintai-api
pm2 save

echo '\''--- ERR LOG ---'\'';  tail -n 200 /home/$BUILD_USER/.pm2/logs/kintai-api-error.log || true
echo '\''--- OUT LOG ---'\'';  tail -n 120 /home/$BUILD_USER/.pm2/logs/kintai-api-out.log   || true

ss -lntp | grep '\'':8001'\'' || { echo '\''listen NG :8001'\''; exit 2; }
curl -fsS http://127.0.0.1:8001/api/admin/health || { echo '\''health NG'\''; exit 3; }
echo '\''✅ backend up on :8001 & health OK'\''
"'
