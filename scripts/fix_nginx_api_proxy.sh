#!/usr/bin/env bash
# Nginx の /api/ を"素のまま"8001 へ渡す（ダブり禁止）

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"

echo "🔧 Fixing Nginx API proxy configuration"
echo "======================================"

ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  
  echo "Current nginx sites-enabled:"
  ls -l /etc/nginx/sites-enabled/ || true
  
  echo "Backing up current config..."
  sudo cp /etc/nginx/sites-enabled/zatint1991.com /etc/nginx/sites-enabled/zatint1991.com.backup.$(date +%Y%m%d_%H%M%S)
  
  echo "Updating /api/ location block..."
  # /api/ ロケーションを正しい形に修正（proxy_pass の末尾 / で経路が二重にならないように）
  sudo perl -i -pe "s|location /api/ \{.*?\}|location /api/ {\n    proxy_set_header Host \$host;\n    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto \$scheme;\n    proxy_read_timeout 60s;\n    proxy_connect_timeout 5s;\n    proxy_pass http://127.0.0.1:8001;   # ← 末尾にスラッシュ付けない！（/api をそのまま渡す）\n}|gs" /etc/nginx/sites-enabled/zatint1991.com
  
  echo "Testing nginx config..."
  sudo nginx -t
  
  echo "Reloading nginx..."
  sudo systemctl reload nginx
  
  echo "✅ Nginx API proxy configuration updated"
'