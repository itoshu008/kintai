#!/bin/bash
# 起動完了シグナル適用スクリプト

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"

echo "🔧 起動完了シグナル適用"
echo "====================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
set -Eeuo pipefail
cd \"'$BACKEND_DIR'\"

# ビルド
npm run build

# PM2 反映（delete→start で設定を確実適用）
export PM2_HOME=/home/$BUILD_USER/.pm2
pm2 delete kintai-api || true
pm2 start \"'$BACKEND_DIR'/pm2.config.cjs\" --only kintai-api
pm2 save

# 観測
echo \"--- OUT LOG ---\"
tail -n 100 /home/$BUILD_USER/.pm2/logs/kintai-api-out.log || true
echo \"--- ERR LOG ---\"
tail -n 100 /home/$BUILD_USER/.pm2/logs/kintai-api-error.log || true

# LISTEN（IPv4/IPv6両対応）＆ヘルス（3連続）
echo \"--- LISTEN CHECK ---\"
ss -H -ltn \"( sport = :8001 )\" | cat
echo \"--- HEALTH CHECK (3 consecutive) ---\"
ok=1; for i in 1 2 3; do 
  curl -fsS http://127.0.0.1:8001/api/admin/health | grep -q '\"ok\":true' || { ok=0; break; }; 
  sleep 1; 
done
[ $ok -eq 1 ] && echo \"✅ cluster+ready: health OK\" || echo \"❌ health NG\"
"'
