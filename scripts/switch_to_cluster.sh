#!/bin/bash
# ③（通った後）clusterに戻したい場合

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"

echo "🔁 clusterモードに戻す"
echo "===================="

ssh "$BUILD_USER@$VPS_HOST" 'bash -lc "
export PM2_HOME=/home/$BUILD_USER/.pm2
pm2 restart kintai-api --update-env --instances 1 --exp-backoff-restart-delay 1000 --time
pm2 save
"'
