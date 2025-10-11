#!/bin/bash

# Cursor用自動デプロイスクリプト
# GitHubから最新コードを取得して自動デプロイ

set -e

# 色付きログ
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 設定
REPO_URL="https://github.com/itoshu008/kintai.git"
BRANCH="main"
PROJECT_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKUP_DIR="/home/zatint1991-hvt55/backups"

log_info "🤖 Cursor Auto Deploy Starting..."

# 1. プロジェクトディレクトリに移動
cd $PROJECT_DIR || {
    log_error "Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

# 2. 現在のバージョンをバックアップ
log_info "📦 Creating backup..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
if [ -d "dist" ]; then
    cp -r dist $BACKUP_DIR/$BACKUP_NAME/
    log_info "  Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# 3. Git操作
log_info "🔄 Updating from GitHub..."

# 現在の変更を保存
if [ -n "$(git status --porcelain)" ]; then
    log_warn "  Uncommitted changes detected, stashing..."
    git stash push -m "Auto-stash before deploy $(date)"
fi

# 最新のコードを取得
git fetch origin
git reset --hard origin/$BRANCH
git clean -fd

log_info "  Git update completed"

# 4. 依存関係のインストール
log_info "📦 Installing dependencies..."

# ルートの依存関係
if [ -f "package.json" ]; then
    log_info "  Installing root dependencies..."
    npm ci --production=false
fi

# バックエンドの依存関係
if [ -d "backend" ] && [ -f "backend/package.json" ]; then
    log_info "  Installing backend dependencies..."
    cd backend
    npm ci --production=false
    cd ..
fi

# フロントエンドの依存関係
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    log_info "  Installing frontend dependencies..."
    cd frontend
    npm ci --production=false
    cd ..
fi

# 5. 環境変数ファイルの設定
log_info "⚙️ Setting up environment..."

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.production" ]; then
        log_info "  Copying env.production to .env"
        cp backend/env.production backend/.env
    else
        log_warn "  No environment file found, using defaults"
    fi
fi

# 6. ビルド実行
log_info "🔨 Building application..."

# バックエンドビルド
if [ -d "backend" ]; then
    log_info "  Building backend..."
    cd backend
    npm run build
    cd ..
    log_info "  Backend build completed"
fi

# フロントエンドビルド
if [ -d "frontend" ]; then
    log_info "  Building frontend..."
    cd frontend
    npm run build
    cd ..
    log_info "  Frontend build completed"
fi

# 7. 権限設定
log_info "🔐 Setting permissions..."
chmod +x backend/dist/index.js 2>/dev/null || true
chmod -R 755 frontend/dist 2>/dev/null || true

# 8. PM2プロセス管理
log_info "🔄 Managing PM2 processes..."

# 既存のプロセスを停止
pm2 stop all 2>/dev/null || log_warn "No PM2 processes to stop"

# バックエンドを起動
if [ -f "backend/dist/index.js" ]; then
    log_info "  Starting backend with PM2..."
    pm2 start backend/dist/index.js --name "kintai-backend" --env production
fi

# 9. ヘルスチェック
log_info "🏥 Performing health checks..."

# バックエンドのヘルスチェック
sleep 5
if curl -f http://localhost:8000/api/admin/backups/health >/dev/null 2>&1; then
    log_info "  ✅ Backend health check passed"
else
    log_warn "  ⚠️ Backend health check failed"
fi

# 10. デプロイ完了
log_info "✅ Cursor Auto Deploy completed successfully!"
log_info "📊 Deploy Summary:"
log_info "  - Repository: $REPO_URL"
log_info "  - Branch: $BRANCH"
log_info "  - Backup: $BACKUP_DIR/$BACKUP_NAME"
log_info "  - Timestamp: $(date)"

# 11. ログ出力
log_info "📝 Recent logs:"
pm2 logs --lines 10 2>/dev/null || log_warn "PM2 logs not available"

echo ""
log_info "🎉 Deploy completed! Check your application at the configured URL."
