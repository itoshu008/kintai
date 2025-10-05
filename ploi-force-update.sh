#!/bin/bash

# Plio Force Update Script
# 強制的に最新コードを取得してデプロイ

echo "🔄 Forcing update from Git..."

# 1. すべてのローカル変更を破棄
git reset --hard HEAD

# 2. 最新のコードを強制取得
git fetch origin
git reset --hard origin/main

# 3. クリーンアップ
echo "🧹 Cleaning up..."
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -f frontend/tsconfig.tsbuildinfo
rm -f backend/tsconfig.tsbuildinfo

# 4. 依存関係を再インストール
echo "📦 Installing dependencies..."
npm install

# 5. フロントエンドビルド
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. バックエンドビルド
echo "🔨 Building backend..."
cd backend
npm install
npm run build
cd ..

# 7. PM2でプロセス開始
echo "🚀 Starting application..."
pm2 stop attendance-app 2>/dev/null || true
pm2 start /var/www/attendance/backend/dist/index.js --name "attendance-app"
pm2 save

echo "✅ Force update completed!"
echo "🌐 Application running at: http://localhost:8000"
