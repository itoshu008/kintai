#!/bin/bash
# ワンショット診断→自動修正→再検証

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
PM2_APP="kintai-api"

echo "🔧 ワンショット診断→自動修正→再検証"
echo "===================================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
set -Eeuo pipefail
APP_DIR='\'''"$APP_DIR"'\'''
BACKEND_DIR='\'''"$BACKEND_DIR"'\'''
PM2_APP='\'''"$PM2_APP"'\'''
export PM2_HOME=/home/$BUILD_USER/.pm2

cd \"$BACKEND_DIR\"

echo \"[1] Node/paths\"; which node; node -v
echo \"[2] dist check\"; ls -l dist | sed -n '\''1,50p'\''
echo \"[3] server.js head\"; sed -n '\''1,80p'\'' dist/server.js || true
echo \"[4] index.js head\";  sed -n '\''1,80p'\'' dist/index.js  || true
echo \"[5] grep listen/PORT/HOST\"; grep -nE \"listen\\(|PORT|HOST\" dist/server.js dist/index.js || true

echo \"[6] direct run (timeout 8s)\" 
export HOST=0.0.0.0 PORT=8001
timeout 8s node dist/server.js ; echo \"<<<direct-exit=$?>>>\" || true

# 代表的な即死の自動修正（あれば適用）
fix=0

# (A) dotenv 未読対策：先頭に dotenv/config が無ければ挿入
if ! grep -q \"dotenv/config\" dist/server.js 2>/dev/null; then
  cp dist/server.js dist/server.js.bak
  printf \"import '\''dotenv/config'\'';\\n\" | cat - dist/server.js.bak > dist/server.js
  echo \"[fix] inject dotenv/config into dist/server.js\"; fix=1
fi

# (B) HOST/PORT が環境優先になっていない or 127.0.0.1 固定なら差し替え
if ! grep -q \"process.env.PORT\" dist/server.js; then
  perl -0777 -pe \"s/const\\s+PORT\\s*=.*?;?/const PORT = Number(process.env.PORT) || 8001;/s\" -i dist/server.js || true
  perl -0777 -pe \"s/const\\s+HOST\\s*=.*?;?/const HOST = process.env.HOST || '\''0.0.0.0'\'';/s\" -i dist/server.js || true
  echo \"[fix] enforce env-first HOST/PORT in dist/server.js\"; fix=1
fi

# (C) index.js にも listen が残って二重起動しそうなら削除
if grep -q \"listen(\" dist/index.js 2>/dev/null; then
  cp dist/index.js dist/index.js.bak
  perl -0777 -pe \"s/.*listen\\(.*\\);?\\n?//g\" -i dist/index.js
  echo \"[fix] remove stray listen() from dist/index.js\"; fix=1
fi

# 再テスト（修正があれば）
if [ \"${fix}\" = \"1\" ]; then
  echo \"[7] re-run after hot fixes (timeout 8s)\"
  timeout 8s node dist/server.js ; echo \"<<<re-run-exit=$?>>>\" || true
fi

# PM2 を fork で一時起動（ログを確実に吐かせる）
cat > pm2.temp.cjs <<'\''CJS'\''
module.exports = { apps: [{
  name: '\''kintai-api'\'',
  script: '\''dist/server.js'\'',
  cwd: process.env.BACKEND_DIR || '\''.'\'',
  exec_mode: '\''fork'\'',
  instances: 1,
  time: true,
  env: { NODE_ENV: '\''production'\'', PORT: '\''8001'\'', HOST: '\''0.0.0.0'\'' },
  out_file: `/home/${process.env.BUILD_USER || '\''itoshu'\''}/.pm2/logs/kintai-api-out.log`,
  error_file: `/home/${process.env.BUILD_USER || '\''itoshu'\''}/.pm2/logs/kintai-api-error.log`,
  merge_logs: true
}]}
CJS

pm2 delete \"$PM2_APP\" >/dev/null 2>&1 || true
pm2 start pm2.temp.cjs --only \"$PM2_APP\"
sleep 1
echo \"[8] ERR/OUT tail\"
tail -n 200 /home/$BUILD_USER/.pm2/logs/kintai-api-error.log || echo no-err-log
tail -n 120 /home/$BUILD_USER/.pm2/logs/kintai-api-out.log   || echo no-out-log

echo \"[9] listen/health\"
ss -lntp | grep :8001 || echo no-listen
curl -fsS http://127.0.0.1:8001/api/admin/health || echo health-NG

# もし起動できたら元の cluster に戻す（任意）
# pm2 restart \"$PM2_APP\" --update-env --instances 1 --update-env

"'
