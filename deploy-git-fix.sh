#!/bin/bash
set -e

# カラー出力用の関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🚀 $1${NC}"; }

# メイン処理開始
echo -e "${PURPLE}🚀 GIT FIX DEPLOY Starting...${NC}"
echo -e "${PURPLE}=============================${NC}"

# 1. 現在のディレクトリ確認
log_step "現在のディレクトリを確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. Gitディレクトリの権限修正
log_step "Gitディレクトリの権限を修正中..."
if [ -d ".git" ]; then
    log_info "Gitディレクトリが見つかりました"
    
    # 所有者を修正
    sudo chown -R zatint1991-hvt55:zatint1991-hvt55 .git
    log_success "Gitディレクトリの所有者を修正しました"
    
    # 権限を修正
    chmod -R 755 .git
    log_success "Gitディレクトリの権限を修正しました"
    
    # .git/objectsディレクトリの特別な権限修正
    if [ -d ".git/objects" ]; then
        chmod -R 755 .git/objects
        log_success ".git/objectsディレクトリの権限を修正しました"
    fi
else
    log_warning "Gitディレクトリが見つかりません"
fi

# 3. プロジェクト全体の権限修正
log_step "プロジェクト全体の権限を修正中..."
sudo chown -R zatint1991-hvt55:zatint1991-hvt55 .
chmod -R 755 .
log_success "プロジェクト全体の権限を修正しました"

# 4. Gitの設定を確認・修正
log_step "Gitの設定を確認・修正中..."
git config --global --add safe.directory /home/zatint1991-hvt55/zatint1991.com
log_success "Gitの安全ディレクトリ設定を追加しました"

# 5. Gitの状態確認
log_step "Gitの状態を確認中..."
git status
log_success "Gitの状態確認完了"

# 6. 手動でGit pullを実行
log_step "最新コードを取得中..."
if git pull origin main; then
    log_success "Git pull 成功！"
else
    log_error "Git pull に失敗しました"
    
    # 代替手段：強制的にリセット
    log_info "代替手段として強制リセットを実行します..."
    git fetch origin main
    git reset --hard origin/main
    log_success "強制リセット完了"
fi

# 7. フロントエンドビルド
log_step "フロントエンドをビルド中..."
cd frontend

# node_modulesをクリーンアップ
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール
log_info "フロントエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# 権限を再修正
chmod -R 755 node_modules 2>/dev/null || true

# ビルド実行
log_info "フロントエンドをビルド中..."
npm run build
log_success "フロントエンドビルド完了"
cd ..

# 8. バックエンドビルド
log_step "バックエンドをビルド中..."
cd backend

# node_modulesをクリーンアップ
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール
log_info "バックエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# 権限を再修正
chmod -R 755 node_modules 2>/dev/null || true

# ビルド実行
log_info "バックエンドをビルド中..."
npm run build
log_success "バックエンドビルド完了"
cd ..

# 9. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicディレクトリにコピー中..."
mkdir -p public
rm -rf public/*
cp -rf frontend/dist/* public/
log_success "フロントエンドコピー完了"

# 10. PM2プロセス管理
log_step "PM2プロセスを管理中..."

# 既存プロセスを停止
log_info "既存のPM2プロセスを停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "既存プロセスが見つかりません"
pm2 delete attendance-app 2>/dev/null || log_warning "既存プロセスが見つかりません"

# ポート8000を強制解放
log_info "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 新しいプロセスを起動
log_info "新しいPM2プロセスを起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2設定を保存
pm2 save
log_success "PM2プロセス管理完了"

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 GIT FIX DEPLOY 完了！${NC}"
echo -e "${GREEN}=============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "GIT FIX DEPLOY が正常に完了しました！"
