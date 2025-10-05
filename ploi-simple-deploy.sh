#!/bin/bash

# Plio Simple Deploy Script
# シンプルなPlioデプロイスクリプト

echo "🚀 Plio Deployment Script for Attendance System"

# 0. 最新コードを取得
echo "📥 Fetching latest code from Git..."
git pull origin main

# 1. 依存関係インストール
npm install

# 2. フロントエンドビルド
cd frontend
npm install
# TypeScriptキャッシュクリア
rm -f tsconfig.tsbuildinfo
npm run build
cd ..

# 3. バックエンドビルド
cd backend
npm install
npm run build
cd ..

# 4. データディレクトリ作成
mkdir -p /var/lib/attendance/data

# 5. フロントエンド配置
mkdir -p /var/www/attendance/frontend
cp -r frontend/dist/* /var/www/attendance/frontend/

# 6. バックエンド配置
mkdir -p /var/www/attendance/backend
cp -r backend/dist/* /var/www/attendance/backend/
cp backend/package.json /var/www/attendance/backend/

# 7. 本番依存関係インストール
cd /var/www/attendance/backend
npm install --production

# 8. PM2でプロセス開始
pm2 stop attendance-app 2>/dev/null || true
pm2 start dist/index.js --name "attendance-app"
pm2 save

echo "✅ Deployment completed!"
echo "🌐 Application running at: http://localhost:8000"
