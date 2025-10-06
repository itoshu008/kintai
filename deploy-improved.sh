#!/bin/bash
set -e

echo "🚀 Improved Deploy Starting..."
echo "📍 Current directory: $(pwd)"

# 最新コード取得
echo "📥 Fetching latest code from Git..."
if git pull origin main; then
    echo "✅ Git pull successful"
else
    echo "❌ Git pull failed"
    exit 1
fi

# フロントエンド
echo "🔨 Building frontend..."
cd frontend
if npm install; then
    echo "✅ Frontend npm install successful"
else
    echo "❌ Frontend npm install failed"
    exit 1
fi

if npm run build; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..

# バックエンド  
echo "🔨 Building backend..."
cd backend
if npm install; then
    echo "✅ Backend npm install successful"
else
    echo "❌ Backend npm install failed"
    exit 1
fi

if npm run build; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
    exit 1
fi
cd ..

# フロントエンドをpublicにコピー
echo "📁 Copying frontend files to public..."
if [ -d "public" ]; then
    echo "🗑️ Removing old public files..."
    rm -rf public/* 2>/dev/null || echo "⚠️ Some files could not be removed (permission issue)"
else
    echo "📁 Creating public directory..."
    mkdir -p public
fi

if cp -r frontend/dist/* public/; then
    echo "✅ Frontend files copied successfully"
else
    echo "❌ Failed to copy frontend files"
    exit 1
fi

# PM2再起動
echo "🔄 Restarting PM2..."
cd backend
pm2 stop attendance-app 2>/dev/null || echo "⚠️ No existing PM2 process to stop"
pm2 delete attendance-app 2>/dev/null || echo "⚠️ No existing PM2 process to delete"

if pm2 start dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"; then
    echo "✅ PM2 started successfully"
else
    echo "❌ PM2 start failed"
    exit 1
fi

pm2 save
echo "✅ PM2 configuration saved"

echo ""
echo "🎉 Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status

