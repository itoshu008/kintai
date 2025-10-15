#!/usr/bin/env bash
# ビルド → PM2（設定ファイル一本化） → ゲート（IPv4/IPv6 & ヘルス3連続）

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
PM2_APP="kintai-api"
PORT=8001

echo "🚀 Deploy and Test 404 Fix"
echo "========================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
set -Eeuo pipefail
export PM2_HOME=/home/'"$BUILD_USER"'/.pm2
cd '"$BACKEND_DIR"'

echo \"Step 1: Installing dependencies...\"
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund

echo \"Step 2: Building...\"
npm run build && npm prune --omit=dev

echo \"Step 3: PM2 restart (clean config)...\"
pm2 delete '"$PM2_APP"' || true
pm2 start '"$BACKEND_DIR"'/pm2.config.cjs --only '"$PM2_APP"'
pm2 save

echo \"Step 4: Checking logs (non-streaming)...\"
ERR_LOG=\$(pm2 info '"$PM2_APP"' | awk -F\": \" \"/error log path/ {print \$2}\")
OUT_LOG=\$(pm2 info '"$PM2_APP"' | awk -F\": \" \"/out log path/ {print \$2}\")
[ -f \"\$ERR_LOG\" ] && { echo \"--- ERR LOG ---\"; tail -n 120 \"\$ERR_LOG\"; } || echo \"no err log\"
[ -f \"\$OUT_LOG\" ] && { echo \"--- OUT LOG ---\"; tail -n 80  \"\$OUT_LOG\"; } || echo \"no out log\"

echo \"Step 5: Port check (IPv4/IPv6)...\"
ss -H -ltn \"( sport = :'"$PORT"' )\" | grep -q . || { echo \"listen NG :'"$PORT"'\"; exit 2; }
echo \"✅ Port '"$PORT"' is listening\"

echo \"Step 6: Health check (3 consecutive)...\"
ok=1; for i in 1 2 3; do 
  echo \"Health check attempt \$i/3...\"
  curl -fsS http://127.0.0.1:'"$PORT"'/api/admin/health | grep -q '\"ok\":true' || { 
    echo \"Health check \$i failed\"; 
    ok=0; 
    break; 
  }
  echo \"Health check \$i passed\"
  sleep 1
done
[ \$ok -eq 1 ] || { echo \"health NG\"; exit 3; }
echo \"✅ All health checks passed\"

echo \"Step 7: API endpoint test...\"
echo \"Testing /api/admin/departments GET...\"
curl -fsS http://127.0.0.1:'"$PORT"'/api/admin/departments | jq . || echo \"GET test failed\"

echo \"Testing /api/admin/departments POST...\"
curl -fsS -X POST http://127.0.0.1:'"$PORT"'/api/admin/departments \
  -H \"Content-Type: application/json\" \
  --data \"{\\\"name\\\":\\\"テスト部署\\\"}\" | jq . || echo \"POST test failed\"

echo \"✅ Backend deployment and testing completed\"
"'
