#!/bin/bash
set -e

echo "🚀 Starting Plio Home Directory Deployment..."

# 0. プロジェクトルートに移動
cd "$(dirname "$0")"
echo "📍 Current directory: $(pwd)"

# 1. 最新コードを取得
echo "📥 Fetching latest code from Git..."
git fetch origin
git reset --hard origin/main

# 2. キャッシュとnode_modulesを削除
echo "🧹 Cleaning up caches..."
rm -rf node_modules frontend/node_modules backend/node_modules
rm -f frontend/tsconfig.tsbuildinfo backend/tsconfig.tsbuildinfo

# 3. 依存関係を再インストール
echo "📦 Installing dependencies..."
npm install

# 4. フロントエンドビルド
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 5. バックエンドビルド
echo "🔨 Building backend..."
cd backend
npm install
npm run build
cd ..

# 6. ホームディレクトリにデプロイ
echo "📂 Deploying to home directory..."
DEPLOY_DIR="$HOME/attendance-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/frontend" "$DEPLOY_DIR/backend" "$DEPLOY_DIR/data"

# フロントエンドファイルをコピー
cp -r frontend/dist/* "$DEPLOY_DIR/frontend/"
echo "✅ Frontend files deployed to $DEPLOY_DIR/frontend"

# バックエンドファイルをコピー
cp -r backend/dist/* "$DEPLOY_DIR/backend/"
cp backend/package.json "$DEPLOY_DIR/backend/"
echo "✅ Backend files deployed to $DEPLOY_DIR/backend"

# データディレクトリを準備
if [ -d "backend/data" ]; then
    cp -r backend/data/* "$DEPLOY_DIR/data/" 2>/dev/null || echo "No existing data to copy"
fi
echo "✅ Data directory prepared at $DEPLOY_DIR/data"

# 環境変数ファイルの配置
if [ -f "backend/env.production" ]; then
    cp backend/env.production "$DEPLOY_DIR/backend/.env"
    # DATA_DIRを更新
    sed -i "s|DATA_DIR=.*|DATA_DIR=$DEPLOY_DIR/data|g" "$DEPLOY_DIR/backend/.env" 2>/dev/null || \
    sed -i '' "s|DATA_DIR=.*|DATA_DIR=$DEPLOY_DIR/data|g" "$DEPLOY_DIR/backend/.env" 2>/dev/null || \
    echo "DATA_DIR=$DEPLOY_DIR/data" >> "$DEPLOY_DIR/backend/.env"
    echo "✅ Production environment file copied and configured"
else
    # 環境変数ファイルがない場合は作成
    cat > "$DEPLOY_DIR/backend/.env" <<EOF
PORT=8000
NODE_ENV=production
DATA_DIR=$DEPLOY_DIR/data
LOG_LEVEL=warn
CORS_ORIGIN=https://zatint1991.com,https://www.zatint1991.com
TZ=Asia/Tokyo
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key")
SESSION_TIMEOUT=86400000
EOF
    echo "✅ Default environment file created"
fi

# 7. 本番環境での依存関係インストール
echo "📦 Installing production dependencies..."
cd "$DEPLOY_DIR/backend"
npm install --production
cd -

# 8. PM2プロセス再起動
echo "🔄 Restarting PM2 process..."
if command -v pm2 &> /dev/null; then
    pm2 stop attendance-app 2>/dev/null || echo "No existing process to stop"
    pm2 delete attendance-app 2>/dev/null || echo "No existing process to delete"
    pm2 start "$DEPLOY_DIR/backend/index.js" --name "attendance-app" --env production
    pm2 save
    echo "✅ PM2 process started"
else
    echo "⚠️ PM2 not found, please install PM2 or use alternative process manager"
fi

# 9. ヘルスチェック
echo "🏥 Performing health check..."
sleep 5
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed - Application is running"
else
    echo "⚠️ Health check failed - Application may still be starting..."
fi

# 10. 最終ステータス
echo ""
echo "📊 Final Status:"
if command -v pm2 &> /dev/null; then
    pm2 status
fi

echo ""
echo "🎉 Plio Home Directory Deployment completed!"
echo "📁 Deployment directory: $DEPLOY_DIR"
echo "🌐 Application URL: http://localhost:8000"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    pm2 logs attendance-app"
echo "   Check status: pm2 status"
echo "   Restart:      pm2 restart attendance-app"

