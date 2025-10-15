#!/bin/bash
# 1) 直接実行で"赤いエラー"を出す（PM2を介さず）

set -Eeuo pipefail

BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
BUILD_USER="itoshu"

echo "🔍 1) 直接実行で赤いエラーを出す（PM2を介さず）"
echo "=================================================="

ssh "$BUILD_USER@zatint1991.com" 'bash -lc "
set -Eeuo pipefail
cd \"'$BACKEND_DIR'\"

echo \"--- node which/version ---\"; which node; node -v
echo \"--- dist listing ---\"; ls -l dist | sed -n \"1,50p\"
echo \"--- head server.js/index.js ---\"
sed -n \"1,80p\" dist/server.js || true
echo \"---\"; sed -n \"1,80p\" dist/index.js || true

echo \"--- direct run (8s timeout) ---\"
export HOST=0.0.0.0 PORT=8001
timeout 8s node dist/server.js ; echo \"<<<exit=$?>>>\"
"'
