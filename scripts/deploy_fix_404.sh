#!/usr/bin/env bash
# 404エラー修正のためのデプロイスクリプト

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"
BACKEND_DIR="/home/zatint1991-hvt55/zatint1991.com/backend"

echo "🔧 404エラー修正デプロイ開始"
echo "================================"

ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  BACKEND_DIR="'$BACKEND_DIR'"
  
  echo "== 1. バックエンドビルド =="
  cd "$BACKEND_DIR"
  npm run build
  
  echo "== 2. PM2再起動 =="
  export PM2_HOME=/home/itoshu/.pm2
  pm2 delete kintai-api || true
  pm2 start "$BACKEND_DIR/pm2.config.cjs" --only kintai-api
  pm2 save
  
  echo "== 3. バックエンド直接テスト =="
  echo "Testing /api/admin/master:"
  curl -sS http://127.0.0.1:8001/api/admin/master?date=2025-10-15 | jq . || echo "❌ /api/admin/master failed"
  
  echo "Testing /api/admin/employees:"
  curl -sS http://127.0.0.1:8001/api/admin/employees | jq . || echo "❌ /api/admin/employees failed"
  
  echo "== 4. PM2ログ確認 =="
  echo "PM2 out log (latest 50 lines):"
  tail -n 50 /home/itoshu/.pm2/logs/kintai-api-out.log || true
  
  echo "PM2 error log (latest 50 lines):"
  tail -n 50 /home/itoshu/.pm2/logs/kintai-api-error.log || true
  
  echo "== 5. ポート8001確認 =="
  ss -lntp | grep :8001 || echo "❌ ポート8001でリスニングしていません"
  
  echo "✅ バックエンド修正完了"
'

echo ""
echo "== 6. Nginx設定修正 =="
bash scripts/fix_nginx_api_proxy.sh

echo ""
echo "== 7. 最終テスト =="
ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  
  echo "Testing Nginx proxy to backend:"
  curl -sS https://zatint1991.com/api/admin/master?date=2025-10-15 | jq . || echo "❌ Nginx proxy failed"
  
  echo "Testing Nginx proxy employees:"
  curl -sS https://zatint1991.com/api/admin/employees | jq . || echo "❌ Nginx proxy employees failed"
  
  echo "✅ 404エラー修正完了"
'
