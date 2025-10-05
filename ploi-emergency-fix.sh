#!/bin/bash

# Plio Emergency Fix Script
# 緊急修復スクリプト - すべての問題を一括解決

echo "🚨 Emergency Fix Starting..."
echo ""

# 現在のディレクトリを表示
echo "📍 Current directory: $(pwd)"
echo ""

# ステップ1: Git状態の確認と修復
echo "🔄 Step 1: Fixing Git state..."
git fetch origin
git reset --hard origin/main
echo "✅ Git reset completed"
echo ""

# ステップ2: 最新コミットの確認
echo "📌 Step 2: Current commit:"
git log --oneline -1
echo ""

# ステップ3: MasterPage.tsxの確認
echo "🔍 Step 3: Checking MasterPage.tsx..."
echo "Line 3 (should have adminApi import):"
sed -n '3p' frontend/src/pages/MasterPage.tsx
echo ""
echo "Line 368 (should have adminApi.updateEmployee):"
sed -n '368p' frontend/src/pages/MasterPage.tsx
echo ""

# adminApiのインポートを確認
if grep -q "api as adminApi" frontend/src/pages/MasterPage.tsx; then
    echo "✅ adminApi import found"
else
    echo "❌ ERROR: adminApi import NOT found!"
    echo "This means the file is not updated. Trying alternative methods..."
    
    # 代替方法: 直接mainブランチからファイルを取得
    git checkout origin/main -- frontend/src/pages/MasterPage.tsx
    echo "✅ Forced file update from origin/main"
fi
echo ""

# ステップ4: 完全クリーンアップ
echo "🧹 Step 4: Complete cleanup..."
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf frontend/dist
rm -rf backend/dist
rm -f frontend/tsconfig.tsbuildinfo
rm -f backend/tsconfig.tsbuildinfo
rm -f tsconfig.tsbuildinfo
echo "✅ Cleanup completed"
echo ""

# ステップ5: 依存関係のインストール
echo "📦 Step 5: Installing dependencies..."
npm install
echo "✅ Root dependencies installed"
echo ""

# ステップ6: フロントエンドビルド
echo "🔨 Step 6: Building frontend..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""
echo "Building..."
if npm run build; then
    echo "✅ Frontend build successful!"
else
    echo "❌ Frontend build FAILED!"
    echo "Showing error details..."
    npm run build 2>&1
    exit 1
fi
cd ..
echo ""

# ステップ7: バックエンドビルド
echo "🔨 Step 7: Building backend..."
cd backend
npm install
echo "✅ Backend dependencies installed"
npm run build
echo "✅ Backend build successful!"
cd ..
echo ""

# ステップ8: デプロイ
echo "🚀 Step 8: Deploying..."
mkdir -p /var/www/attendance/frontend
mkdir -p /var/www/attendance/backend

# フロントエンドファイルのコピー
cp -r frontend/dist/* /var/www/attendance/frontend/
echo "✅ Frontend files deployed"

# バックエンドファイルのコピー
cp -r backend/dist/* /var/www/attendance/backend/
cp backend/package.json /var/www/attendance/backend/
echo "✅ Backend files deployed"

# 本番環境の依存関係インストール
cd /var/www/attendance/backend
npm install --production
cd -
echo "✅ Production dependencies installed"
echo ""

# ステップ9: PM2再起動
echo "🔄 Step 9: Restarting application..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start /var/www/attendance/backend/dist/index.js --name "attendance-app"
pm2 save
echo "✅ Application restarted"
echo ""

# ステップ10: 確認
echo "🏥 Step 10: Health check..."
sleep 3
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Application is running!"
else
    echo "⚠️ Health check failed, but application may still be starting..."
fi
echo ""

# 最終確認
echo "📊 Final Status:"
pm2 status
echo ""

echo "🎉 Emergency fix completed!"
echo "🌐 Application URL: http://localhost:8000"
echo ""
echo "To view logs: pm2 logs attendance-app"
echo "To check status: pm2 status"
