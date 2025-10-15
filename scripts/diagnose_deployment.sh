#!/bin/bash
# デプロイ診断スクリプト
set -Eeuo pipefail

echo "🔍 デプロイ診断を開始します..."

# 変数設定
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PM2_APP="kintai-api"

echo "📁 ディレクトリ構造確認"
echo "APP_DIR: $APP_DIR"
ls -la "$APP_DIR" || echo "❌ APP_DIR not found"

echo "BACKEND_DIR: $BACKEND_DIR"
ls -la "$BACKEND_DIR" || echo "❌ BACKEND_DIR not found"

echo "FRONTEND_DIR: $FRONTEND_DIR"
ls -la "$FRONTEND_DIR" || echo "❌ FRONTEND_DIR not found"

echo "📦 バックエンド依存関係確認"
cd "$BACKEND_DIR" || { echo "❌ Cannot cd to backend"; exit 1; }
echo "package.json exists: $(test -f package.json && echo 'YES' || echo 'NO')"
echo "package-lock.json exists: $(test -f package-lock.json && echo 'YES' || echo 'NO')"
echo "node_modules exists: $(test -d node_modules && echo 'YES' || echo 'NO')"

echo "🔧 TypeScript設定確認"
echo "tsconfig.json exists: $(test -f tsconfig.json && echo 'YES' || echo 'NO')"
if [ -f tsconfig.json ]; then
  echo "TypeScript config:"
  cat tsconfig.json | head -10
fi

echo "🏗️ ビルド確認"
echo "dist directory exists: $(test -d dist && echo 'YES' || echo 'NO')"
if [ -d dist ]; then
  echo "dist contents:"
  ls -la dist/
  echo "server.js exists: $(test -f dist/server.js && echo 'YES' || echo 'NO')"
  echo "index.js exists: $(test -f dist/index.js && echo 'YES' || echo 'NO')"
fi

echo "🔄 PM2状態確認"
pm2 status || echo "❌ PM2 not running"
pm2 describe "$PM2_APP" 2>/dev/null || echo "❌ PM2 app $PM2_APP not found"

echo "🌐 ネットワーク確認"
echo "Port 8001 listening:"
ss -lntp | grep ':8001' || echo "❌ Port 8001 not listening"

echo "🔗 ヘルスチェック"
curl -sS http://127.0.0.1:8001/api/admin/health || echo "❌ Health check failed"

echo "📋 PM2ログ（最新50行）"
pm2 logs "$PM2_APP" --lines 50 --timestamp --raw || echo "❌ Cannot get PM2 logs"

echo "✅ 診断完了"
