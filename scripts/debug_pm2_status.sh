#!/bin/bash
# 2) PM2側の実引数・環境・ログパスをJSONで吸い上げ

set -Eeuo pipefail

BUILD_USER="itoshu"
PM2_APP="kintai-api"

echo "🧰 2) PM2側の実引数・環境・ログパスをJSONで吸い上げ"
echo "=================================================="

ssh "$BUILD_USER@zatint1991.com" 'bash -lc "
set -Eeuo pipefail
export PM2_HOME=/home/'"$BUILD_USER"'/.pm2
pm2 prettylist --silent | jq -r \".[] | select(.name==\\\"'$PM2_APP'\\\") | 
  {name, pm_id, pm2_env:{cwd,script,exec_mode,instances,PORT:(.env.PORT),HOST:(.env.HOST),
  out_log_path,error_log_path,merge_logs,pm_out_log_path,pm_err_log_path,args}}\"
"'
