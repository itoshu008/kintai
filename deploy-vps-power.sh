#!/bin/bash
set -e

echo "🚀 VPS POWER DEPLOY Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"
echo "🖥️  VPS Server: $(hostname)"
echo "👤 User: $(whoami)"

# 権限確認
echo "🔐 Checking permissions..."
ls -la . | head -5
echo "✅ Permission check completed"

# 最新コード取得
echo "📥 Fetching latest code from Git..."
git pull origin main
echo "✅ Git pull completed"

# 完全クリーンアップ（権限エラーを回避）
echo "🧹 ULTRA cleanup (VPS optimized)..."
# 古いビルドディレクトリを削除（権限エラーを無視）
rm -rf frontend/dist/ 2>/dev/null || echo "⚠️ Frontend dist cleanup skipped"
rm -rf backend/dist/ 2>/dev/null || echo "⚠️ Backend dist cleanup skipped"
rm -rf public/* 2>/dev/null || echo "⚠️ Public cleanup skipped"
rm -rf frontend/node_modules/.vite/ 2>/dev/null || echo "⚠️ Vite cache cleanup skipped"
echo "✅ ULTRA cleanup completed"

# 権限修正（VPS用）
echo "🔧 Fixing permissions for VPS..."
chmod -R 755 . 2>/dev/null || echo "⚠️ Permission fix skipped"
echo "✅ Permissions fixed"

# フロントエンド
echo "🔨 Building frontend (VPS optimized)..."
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building frontend..."
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

# バックエンド
echo "🔨 Building backend (VPS optimized)..."
cd backend
echo "📦 Installing backend dependencies..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true
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

# Publicへ反映（VPS用）
echo "📤 Copying frontend to public directory (VPS optimized)..."
mkdir -p public
# 既存ファイルを削除（権限エラーを無視）
rm -rf public/* 2>/dev/null || true
# フロントエンドファイルをコピー
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

# PM2プロセス管理（VPS用）
echo "🔄 Managing PM2 processes (VPS optimized)..."
# 既存のPM2プロセスを停止・削除
pm2 stop attendance-app 2>/dev/null || echo "⚠️ PM2 process not running"
pm2 delete attendance-app 2>/dev/null || echo "⚠️ PM2 process not found"

# ポート8000を使用中のプロセスを強制終了
echo "🔫 Killing processes on port 8000..."
sudo fuser -k 8000/tcp 2>/dev/null || echo "⚠️ No process on port 8000"

# PM2でアプリケーションを起動
echo "🚀 Starting PM2 process..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"
echo "✅ PM2 process started"

# PM2設定を保存
pm2 save
echo "✅ PM2 configuration saved"

# システム情報表示
echo "📊 System Information:"
echo "🖥️  Server: $(hostname)"
echo "👤 User: $(whoami)"
echo "📁 Working Directory: $(pwd)"
echo "🌐 Public Directory: $(ls -la public/ | wc -l) files"
echo "📦 Backend Build: $(ls -la backend/dist/ | wc -l) files"

# PM2ステータス確認
echo "📊 PM2 Status:"
pm2 status

# ポート使用状況確認
echo "🔌 Port Status:"
netstat -tlnp | grep :8000 || echo "⚠️ Port 8000 not in use"

echo "🎉 VPS POWER DEPLOY Complete!"
echo "🌐 https://zatint1991.com"
echo "📅 Deploy completed at: $(date)"
echo "✅ Ready for production use!"

