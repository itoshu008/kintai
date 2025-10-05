#!/bin/bash
set -e

echo "🚀 SIMPLE BUILD DEPLOY Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 1. 最新コード取得
echo "📥 Fetching latest code..."
git pull origin main
echo "✅ Git pull completed"

# 2. フロントエンドビルド（新しいディレクトリに）
echo "🔨 Building frontend..."
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true

# 新しいビルドディレクトリを使用
BUILD_DIR="dist-new-$(date +%s)"
echo "🏗️ Building frontend to new directory: $BUILD_DIR..."

# Vite設定を一時的に変更
cat > vite.config.temp.ts << EOF
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
    outDir: '$BUILD_DIR',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: \`assets/[name]-[hash].js\`,
        chunkFileNames: \`assets/[name]-[hash].js\`,
        assetFileNames: \`assets/[name]-[hash].[ext]\`
      }
    }
  },
});
EOF

# 一時的な設定でビルド
npx vite build --config vite.config.temp.ts
echo "✅ Frontend build completed"

# 一時設定を削除
rm vite.config.temp.ts

# ビルド結果確認
echo "📁 Frontend build output:"
ls -la $BUILD_DIR/
if [ ! -f $BUILD_DIR/index.html ]; then
  echo "❌ Frontend build failed: index.html not found in $BUILD_DIR/"
  exit 1
fi
echo "📄 index.html exists"
cd .. # 親ディレクトリに戻る

# 3. バックエンドビルド（新しいディレクトリに）
echo "🔨 Building backend..."
cd backend
echo "📦 Installing backend dependencies..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true

# 新しいビルドディレクトリを使用
BACKEND_BUILD_DIR="dist-new-$(date +%s)"
echo "🏗️ Building backend to new directory: $BACKEND_BUILD_DIR..."

# tsconfig.jsonを一時的に変更
cp tsconfig.json tsconfig.json.backup
cat > tsconfig.temp.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "$BACKEND_BUILD_DIR",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "dist-*"]
}
EOF

# 一時的な設定でビルド
npx tsc -p tsconfig.temp.json
echo "✅ Backend build completed"

# 一時設定を削除
rm tsconfig.temp.json
mv tsconfig.json.backup tsconfig.json 2>/dev/null || true

# ビルド結果確認
echo "📁 Backend build output:"
ls -la $BACKEND_BUILD_DIR/
if [ ! -f $BACKEND_BUILD_DIR/index.js ]; then
  echo "❌ Backend build failed: index.js not found in $BACKEND_BUILD_DIR/"
  exit 1
fi
echo "📄 index.js exists"
cd .. # 親ディレクトリに戻る

# 4. 新しいpublicディレクトリへコピー
PUBLIC_DIR="public-new-$(date +%s)"
echo "📤 Copying frontend to new public directory: $PUBLIC_DIR..."
mkdir -p $PUBLIC_DIR
cp -rf frontend/$BUILD_DIR/* $PUBLIC_DIR/ 2>/dev/null || true
echo "✅ Frontend copied to $PUBLIC_DIR"

# コピー結果確認
echo "📁 Public directory contents:"
ls -la $PUBLIC_DIR/
if [ ! -f $PUBLIC_DIR/index.html ]; then
  echo "❌ Frontend copy failed: index.html not found in $PUBLIC_DIR/"
  exit 1
fi

# 5. PM2再起動（新しいパスで）
echo "🔄 Restarting PM2 process..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start backend/$BACKEND_BUILD_DIR/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/$PUBLIC_DIR" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"
echo "✅ PM2 process started/restarted"

pm2 save
echo "✅ PM2 configuration saved"

# 6. 古いディレクトリをクリーンアップ（オプション）
echo "🧹 Cleaning up old directories..."
find frontend -maxdepth 1 -name "dist-new-*" -type d ! -name "$BUILD_DIR" -exec rm -rf {} \; 2>/dev/null || true
find backend -maxdepth 1 -name "dist-new-*" -type d ! -name "$BACKEND_BUILD_DIR" -exec rm -rf {} \; 2>/dev/null || true
find . -maxdepth 1 -name "public-new-*" -type d ! -name "$PUBLIC_DIR" -exec rm -rf {} \; 2>/dev/null || true
echo "✅ Cleanup completed"

echo ""
echo "🎉 SIMPLE BUILD Deploy Complete!"
echo "🌐 https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo "📅 Deploy completed at: $(date)"
echo ""
echo "📁 New directories:"
echo "   Frontend: frontend/$BUILD_DIR"
echo "   Backend: backend/$BACKEND_BUILD_DIR"
echo "   Public: $PUBLIC_DIR"
echo ""
echo "🔍 To verify changes:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Check https://zatint1991.com/admin-dashboard-2024"
echo "3. Check https://zatint1991.com/personal"
