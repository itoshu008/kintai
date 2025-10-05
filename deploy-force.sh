#!/bin/bash
set -e

echo "🚀 Force Deploy Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 最新コード取得
echo "📥 Fetching latest code..."
git pull origin main
echo "✅ Git pull completed"

# 完全クリーンアップ
echo "🧹 Complete cleanup..."
rm -rf frontend/dist/ 2>/dev/null || true
rm -rf backend/dist/ 2>/dev/null || true
rm -rf public/* 2>/dev/null || true
rm -rf frontend/node_modules/.vite/ 2>/dev/null || true
echo "✅ Cleanup completed"

# Frontend
echo "🔨 Building frontend..."
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building frontend (force clean)..."
npm run build
echo "✅ Frontend build completed"

# ビルド結果確認
echo "📁 Frontend build output:"
ls -la dist/
echo "📄 index.html exists:"
ls -la dist/index.html

cd ..

# Backend
echo "🔨 Building backend..."
cd backend
echo "📦 Installing backend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building backend..."
npm run build
echo "✅ Backend build completed"

# ビルド結果確認
echo "📁 Backend build output:"
ls -la dist/

cd ..

# Copy to public
echo "📁 Copying frontend files to public..."
mkdir -p public
cp -rf frontend/dist/* public/
echo "✅ Frontend files copied"

# コピー結果確認
echo "📁 Public directory contents:"
ls -la public/
echo "📄 index.html in public:"
ls -la public/index.html

# PM2 restart
echo "🔄 Restarting PM2..."
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
echo "✅ PM2 restarted"

echo ""
echo "🎉 Force Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo "📅 Deploy completed at: $(date)"
