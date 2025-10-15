#!/usr/bin/env bash
# Nginx の残骸掃除（重複server名の警告を消す）

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"

echo "🧹 Nginx Cleanup"
echo "==============="

ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  echo "Current nginx sites-enabled:"
  ls -l /etc/nginx/sites-enabled/ || true
  
  echo "Removing backup files..."
  sudo rm -f /etc/nginx/sites-enabled/zatint1991.com.bak.* || true
  
  echo "Testing nginx config..."
  sudo nginx -t
  
  echo "Reloading nginx..."
  sudo systemctl reload nginx
  
  echo "✅ Nginx cleanup completed"
'
