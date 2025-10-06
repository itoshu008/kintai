#!/bin/bash
set -e

echo "🚀 Simple Deploy Starting..."

# 最新コード取得
git pull origin main

# フロントエンド
cd frontend
npm install
npm run build
cd ..

# バックエンド  
cd backend
npm install
npm run build
cd ..

# フロントエンドをpublicにコピー
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/

# PM2再起動
cd backend
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"

pm2 save

echo "✅ Deploy Complete!"
echo "🌐 https://zatint1991.com"

