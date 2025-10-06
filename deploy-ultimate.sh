#!/bin/bash
set -e

echo "🚀 ULTIMATE DEPLOY Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 1. 最新コード取得
echo "📥 Fetching latest code..."
git pull origin main
echo "✅ Git pull completed"

# 2. 権限を修正
echo "🔐 Fixing permissions..."
chmod -R 755 /home/zatint1991-hvt55/zatint1991.com 2>/dev/null || true
echo "✅ Permissions fixed"

# 3. 完全クリーンアップ（より強力）
echo "🧹 ULTIMATE cleanup..."
rm -rf frontend/dist/ 2>/dev/null || true
rm -rf backend/dist/ 2>/dev/null || true
rm -rf public/* 2>/dev/null || true
rm -rf frontend/node_modules/.vite/ 2>/dev/null || true
rm -rf frontend/node_modules/.cache/ 2>/dev/null || true
rm -rf backend/node_modules/.cache/ 2>/dev/null || true

# 4. フロントエンドディレクトリを完全に再作成
echo "🔨 Recreating frontend dist directory..."
cd frontend
rm -rf dist/ 2>/dev/null || true
mkdir -p dist 2>/dev/null || true
chmod -R 755 dist/ 2>/dev/null || true
echo "✅ Frontend dist directory recreated"

# 5. フロントエンドビルド
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true
echo "🏗️ Building frontend..."

# Viteの設定を一時的に変更して権限エラーを回避
echo "🔧 Temporarily modifying Vite config..."
cp vite.config.ts vite.config.ts.backup 2>/dev/null || true

# 一時的なVite設定を作成（権限エラー回避）
cat > vite.config.temp.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: {
      "/api/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: false, // 権限エラー回避
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
});
EOF

# 一時的な設定でビルド
mv vite.config.temp.ts vite.config.ts
npm run build
echo "✅ Frontend build completed"

# 元の設定を復元
mv vite.config.ts.backup vite.config.ts 2>/dev/null || true

# ビルド結果確認
echo "📁 Frontend build output:"
ls -la dist/
if [ ! -f dist/index.html ]; then
  echo "❌ Frontend build failed: index.html not found in dist/"
  exit 1
fi
echo "📄 index.html exists: $(ls -la dist/index.html)"
cd .. # 親ディレクトリに戻る

# 6. バックエンド
echo "🔨 Building backend..."
cd backend
rm -rf dist/ 2>/dev/null || true
mkdir -p dist 2>/dev/null || true
chmod -R 755 dist/ 2>/dev/null || true
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

# 7. Publicへ反映
echo "📤 Copying frontend to public directory..."
mkdir -p public
rm -rf public/* 2>/dev/null || true
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

# 8. ファイルのタイムスタンプを強制的に更新
echo "🕒 Updating file timestamps..."
find public -type f -exec touch {} \;
echo "✅ File timestamps updated"

# 9. PM2再起動
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
echo "🎉 ULTIMATE Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo "📅 Deploy completed at: $(date)"
echo ""
echo "🔍 To verify changes:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Check https://zatint1991.com/admin-dashboard-2024"
echo "3. Check https://zatint1991.com/personal"

