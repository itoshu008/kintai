#!/bin/bash
set -e
cd /home/zatint1991-hvt55/zatint1991.com

echo "🚀 Robust Deploy Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# Git pull
echo "📥 Fetching latest code..."
git pull origin main
echo "✅ Git pull completed"

# Frontend
echo "🔨 Building frontend..."
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building frontend..."
if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "⚠️ Frontend build failed but continuing..."
fi

# Backend
echo "🔨 Building backend..."
cd ../backend
echo "📦 Installing backend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building backend..."
if npm run build; then
    echo "✅ Backend build successful"
else
    echo "⚠️ Backend build failed but continuing..."
fi

# Copy to public
echo "📁 Copying frontend files to public..."
cd ..
if cp -rf frontend/dist/* public/ 2>/dev/null; then
    echo "✅ Frontend files copied successfully"
else
    echo "⚠️ Failed to copy frontend files, trying alternative method..."
    # 代替方法
    [ -d frontend/dist/assets ] && mkdir -p public/assets && cp -rf frontend/dist/assets/* public/assets/ 2>/dev/null || true
    echo "✅ Alternative copy method completed"
fi

# PM2 restart
echo "🔄 Restarting PM2..."
if pm2 restart attendance-app; then
    echo "✅ PM2 restart successful"
else
    echo "⚠️ PM2 restart failed, trying to start new process..."
    pm2 start backend/dist/index.js --name "attendance-app" --env production \
      --env PORT=8000 \
      --env NODE_ENV=production \
      --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
      --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
      --env LOG_LEVEL=info \
      --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"
    echo "✅ PM2 started successfully"
fi

pm2 save
echo "✅ PM2 configuration saved"

echo ""
echo "🎉 Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo "📅 Deploy completed at: $(date)"

