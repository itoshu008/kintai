#!/bin/bash
# 4) それでもログが出ない場合に備えて：サーバコード側に保険ログ

set -Eeuo pipefail

BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"
BUILD_USER="itoshu"

echo "🛡️ 4) それでもログが出ない場合に備えて：サーバコード側に保険ログ"
echo "============================================================="

ssh "$BUILD_USER@zatint1991.com" 'bash -lc "
set -Eeuo pipefail
cd \"'$BACKEND_DIR'\"

# server.ts 由来の try/catch & global-handlers を dist に直Inject（元ソースを触らず応急処置）
tmp=dist/server.js
[ -f \$tmp ] || { echo \"no dist/server.js\"; exit 1; }
cp \$tmp \${tmp}.bak
awk \"BEGIN{print \\\"process.on(\\'"'"'uncaughtException\\'"'"',e=>{console.error('[FATAL uncaught]',e);process.exit(1);});\\\\nprocess.on(\\'"'"'unhandledRejection\\'"'"',e=>{console.error('[FATAL unhandled]',e);process.exit(1);});\\\"}{print}\" \${tmp}.bak > \$tmp

echo '"'"'--- direct run with handlers ---'"'"'
export HOST=0.0.0.0 PORT=8001
timeout 8s node dist/server.js ; echo \"<<<exit=$?>>>\"
"'
