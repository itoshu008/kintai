#!/bin/bash

# Plio Deploy Script for Attendance Management System
# 勤怠管理システム用Plioデプロイスクリプト

set -e  # エラー時に停止

echo "🚀 Starting deployment process..."

# 0. 最新コードを取得
echo "📥 Fetching latest code from Git..."
git pull origin main

# 1. 依存関係のインストール
echo "📦 Installing dependencies..."
npm install

# 2. フロントエンドのビルド
echo "🔨 Building frontend..."
cd frontend
npm install
# TypeScriptキャッシュクリア
rm -f tsconfig.tsbuildinfo
npm run build
cd ..

# 3. バックエンドのビルド
echo "🔨 Building backend..."
cd backend
npm install
npm run build
cd ..

# 4. データディレクトリの作成
echo "📁 Creating data directory..."
mkdir -p /var/lib/attendance/data
chmod 755 /var/lib/attendance/data

# 5. フロントエンドファイルの配置
echo "📂 Deploying frontend files..."
mkdir -p /var/www/attendance/frontend
cp -r frontend/dist/* /var/www/attendance/frontend/
chmod -R 755 /var/www/attendance/frontend

# 6. バックエンドファイルの配置
echo "📂 Deploying backend files..."
mkdir -p /var/www/attendance/backend
cp -r backend/dist/* /var/www/attendance/backend/
cp backend/package.json /var/www/attendance/backend/
cp -r backend/node_modules /var/www/attendance/backend/ 2>/dev/null || echo "Node modules will be installed in production"

# 7. 環境変数ファイルの配置
echo "⚙️ Setting up environment variables..."
if [ -f "backend/env.production" ]; then
    cp backend/env.production /var/www/attendance/backend/.env
    echo "✅ Production environment file copied"
else
    echo "⚠️ Warning: env.production not found, using default settings"
fi

# 8. 本番環境での依存関係インストール
echo "📦 Installing production dependencies..."
cd /var/www/attendance/backend
npm install --production
cd /var/www/attendance

# 9. プロセス管理の設定
echo "🔄 Setting up process management..."
# PM2を使用する場合
if command -v pm2 &> /dev/null; then
    pm2 stop attendance-app 2>/dev/null || echo "No existing process to stop"
    pm2 start /var/www/attendance/backend/dist/index.js --name "attendance-app" --env production
    pm2 save
    echo "✅ PM2 process started"
else
    echo "⚠️ PM2 not found, please install PM2 or use alternative process manager"
fi

# 10. ログディレクトリの設定
echo "📝 Setting up log directories..."
mkdir -p /var/log/attendance
chmod 755 /var/log/attendance

# 11. 権限設定
echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/attendance
chown -R www-data:www-data /var/lib/attendance
chown -R www-data:www-data /var/log/attendance

# 12. サービス再起動
echo "🔄 Restarting services..."
if command -v systemctl &> /dev/null; then
    systemctl reload nginx 2>/dev/null || echo "Nginx not configured or not running"
fi

# 13. ヘルスチェック
echo "🏥 Performing health check..."
sleep 5
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed - Application is running"
else
    echo "❌ Health check failed - Please check application logs"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "📊 Application Status:"
echo "   - Frontend: http://localhost:8000"
echo "   - API: http://localhost:8000/api"
echo "   - Health: http://localhost:8000/api/health"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your domain in CORS_ORIGIN environment variable"
echo "   2. Set up SSL certificate if needed"
echo "   3. Configure database if using external database"
echo "   4. Set up monitoring and logging"
