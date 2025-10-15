#!/usr/bin/env bash
# 誤操作ガード（設定ファイルを読み取り専用に）

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"

echo "🛡️ Config Protection"
echo "==================="

ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  cd "'"$BACKEND_DIR"'"
  
  echo "Making pm2.config.cjs immutable (read-only)..."
  sudo chattr +i pm2.config.cjs || echo "chattr failed (may not be supported)"
  
  echo "Setting restrictive permissions..."
  chmod 444 pm2.config.cjs
  
  echo "Current file attributes:"
  lsattr pm2.config.cjs 2>/dev/null || ls -la pm2.config.cjs
  
  echo "✅ Config protection applied"
  echo "To modify: sudo chattr -i pm2.config.cjs && chmod 644 pm2.config.cjs"
'
