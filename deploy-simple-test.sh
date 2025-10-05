#!/bin/bash
set -e

echo "🔍 SIMPLE TEST DEPLOY Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 現在の状況確認
echo "📊 Current Status:"
echo "🖥️  Server: $(hostname)"
echo "👤 User: $(whoami)"
echo "📁 Directory: $(pwd)"
echo "📦 Git Status:"
git status --porcelain

# PM2状況確認
echo "📊 PM2 Status:"
pm2 status || echo "⚠️ PM2 not running"

# ポート確認
echo "🔌 Port 8000 Status:"
netstat -tlnp | grep :8000 || echo "⚠️ Port 8000 not in use"

# 最新コード取得
echo "📥 Fetching latest code..."
git fetch origin main
git reset --hard origin/main
echo "✅ Git reset completed"

# フロントエンド
echo "🔨 Building frontend..."
cd frontend
npm install --silent
npm run build
echo "✅ Frontend build completed"
cd ..

# バックエンド
echo "🔨 Building backend..."
cd backend
npm install --silent
npm run build
echo "✅ Backend build completed"
cd ..

# Publicディレクトリ作成
echo "📤 Setting up public directory..."
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/
echo "✅ Public directory setup completed"

# PM2起動
echo "🚀 Starting PM2..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

pm2 save

# 最終確認
echo "📊 Final Status:"
pm2 status
echo "🔌 Port Status:"
netstat -tlnp | grep :8000 || echo "⚠️ Port 8000 not in use"

echo "✅ SIMPLE TEST DEPLOY Complete!"
echo "🌐 https://zatint1991.com"
