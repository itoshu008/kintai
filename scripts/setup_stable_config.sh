#!/usr/bin/env bash
# 統合セットアップスクリプト（設定統一＋反映＋確認）

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="$APP_DIR/backend"

echo "🚀 Stable Config Setup"
echo "====================="

# 1) ドリフト検知
echo "Step 1: Drift guard check..."
bash scripts/drift_guard.sh

# 2) デプロイスクリプトをVPSに送信
echo "Step 2: Upload deploy script to VPS..."
scp scripts/deploy_backend.sh "$BUILD_USER@$VPS_HOST:$APP_DIR/scripts/"

# 3) VPSでデプロイ実行
echo "Step 3: Deploy backend on VPS..."
ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  export PM2_HOME=/home/'"$BUILD_USER"'/.pm2
  export BACKEND_DIR="'"$BACKEND_DIR"'"
  export PM2_APP=kintai-api
  bash "'"$APP_DIR"'/scripts/deploy_backend.sh"
'

# 4) Nginx クリーンアップ
echo "Step 4: Nginx cleanup..."
bash scripts/cleanup_nginx.sh

# 5) 設定保護（任意）
echo "Step 5: Config protection (optional)..."
read -p "Apply config protection? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  bash scripts/protect_config.sh
fi

echo "✅ Stable config setup completed!"
echo "Configuration is now locked and consistent."
