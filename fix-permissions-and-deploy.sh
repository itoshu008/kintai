#!/bin/bash
set -e

echo "🔧 Fixing permissions and deploying..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 1. 権限を修正
echo "🔐 Fixing permissions..."
sudo chown -R zatint1991-hvt55:zatint1991-hvt55 /home/zatint1991-hvt55/zatint1991.com
chmod -R 755 /home/zatint1991-hvt55/zatint1991.com
echo "✅ Permissions fixed"

# 2. 最新コード取得
echo "📥 Fetching latest code..."
git pull origin main
echo "✅ Git pull completed"

# 3. 完全クリーンアップ（権限修正後）
echo "🧹 ULTRA cleanup with sudo..."
sudo rm -rf frontend/dist/ 2>/dev/null || true
sudo rm -rf backend/dist/ 2>/dev/null || true
sudo rm -rf public/* 2>/dev/null || true
sudo rm -rf frontend/node_modules/.vite/ 2>/dev/null || true
sudo rm -rf frontend/node_modules/.cache/ 2>/dev/null || true
sudo rm -rf backend/node_modules/.cache/ 2>/dev/null || true
echo "✅ ULTRA cleanup completed"

# 4. フロントエンド
echo "🔨 Building frontend..."
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building frontend (ULTRA force clean)..."
npm run build
echo "✅ Frontend build completed"

# ビルド結果確認
echo "📁 Frontend build output:"
ls -la dist/
if [ ! -f dist/index.html ]; then
  echo "❌ Frontend build failed: index.html not found in dist/"
  exit 1
fi
echo "📄 index.html exists: $(ls -la dist/index.html)"
cd .. # 親ディレクトリに戻る

# 5. バックエンド
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
if [ ! -f dist/index.js ]; then
  echo "❌ Backend build failed: index.js not found in dist/"
  exit 1
fi
echo "📄 index.js exists: $(ls -la dist/index.js)"
cd .. # 親ディレクトリに戻る

# 6. Publicへ反映（権限修正後）
echo "📤 Copying frontend to public directory..."
mkdir -p public
sudo rm -rf public/* 2>/dev/null || true
cp -rf frontend/dist/* public/ 2>/dev/null || true
# assetsディレクトリも確実にコピー
[ -d frontend/dist/assets ] && mkdir -p public/assets && cp -rf frontend/dist/assets/* public/assets/ 2>/dev/null || true
echo "✅ Frontend copied to public"

# コピー結果確認
echo "📁 Public directory contents:"
ls -la public/
if [ ! -f public/index.html ]; then
  echo "❌ Frontend copy failed: index.html not found in public/"
  exit 1
fi
echo "📄 index.html in public: $(ls -la public/index.html)"

# 7. ファイルのタイムスタンプを強制的に更新
echo "🕒 Updating file timestamps..."
find public -type f -exec touch {} \;
echo "✅ File timestamps updated"

# 8. PM2再起動
echo "🔄 Restarting PM2 process..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"
echo "✅ PM2 process started/restarted"

pm2 save
echo "✅ PM2 configuration saved"

echo ""
echo "🎉 PERMISSION-FIXED Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo "📅 Deploy completed at: $(date)"
echo ""
echo "🔍 To verify changes:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Check https://zatint1991.com/admin-dashboard-2024"
echo "3. Check https://zatint1991.com/personal"

