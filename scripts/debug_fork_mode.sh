#!/bin/bash
# 3) 一時的に fork モード＋ログファイル強制で再起動（観測性UP）

set -Eeuo pipefail

BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
BUILD_USER="itoshu"
PM2_APP="kintai-api"

echo "🧱 3) 一時的に fork モード＋ログファイル強制で再起動（観測性UP）"
echo "================================================================"

ssh "$BUILD_USER@zatint1991.com" 'bash -lc "
set -Eeuo pipefail
cd \"'$BACKEND_DIR'\"

cat > pm2.config.cjs <<'"'"'CJS'"'"'
module.exports = {
  apps: [{
    name: '"'"'kintai-api'"'"',
    script: '"'"'dist/server.js'"'"',
    cwd: '"'"''$BACKEND_DIR''"'"',
    exec_mode: '"'"'fork'"'"',         // ← 一時的に fork
    instances: 1,
    time: true,
    env: { NODE_ENV: '"'"'production'"'"', PORT: '"'"'8001'"'"', HOST: '"'"'0.0.0.0'"'"' },
    out_file: '"'"'/home/'$BUILD_USER'/.pm2/logs/kintai-api-out.log'"'"',
    error_file: '"'"'/home/'$BUILD_USER'/.pm2/logs/kintai-api-error.log'"'"',
    merge_logs: true
  }]
}
CJS

export PM2_HOME=/home/'$BUILD_USER'/.pm2
pm2 delete kintai-api || true
pm2 start pm2.config.cjs --only kintai-api
pm2 save

echo '"'"'--- tail logs ---'"'"'
tail -n 200 /home/'$BUILD_USER'/.pm2/logs/kintai-api-error.log || true
tail -n 120 /home/'$BUILD_USER'/.pm2/logs/kintai-api-out.log   || true

echo '"'"'--- listen check ---'"'"'
ss -lntp | grep :8001 || echo no-listen
"'
