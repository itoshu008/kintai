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
echo -e "${PURPLE}🚀 NO-GIT DEPLOY Starting...${NC}"
echo -e "${PURPLE}============================${NC}"

# 1. 現在のディレクトリ確認
log_step "現在のディレクトリを確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. フロントエンドビルド
log_step "フロントエンドをビルド中..."
cd frontend

# node_modulesをクリーンアップ
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール
log_info "フロントエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# 権限を修正
chmod -R 755 node_modules 2>/dev/null || true

# ビルド実行
log_info "フロントエンドをビルド中..."
npm run build
log_success "フロントエンドビルド完了"
cd ..

# 3. バックエンドビルド
log_step "バックエンドをビルド中..."
cd backend

# node_modulesをクリーンアップ
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール
log_info "バックエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# 権限を修正
chmod -R 755 node_modules 2>/dev/null || true

# ビルド実行
log_info "バックエンドをビルド中..."
npm run build
log_success "バックエンドビルド完了"
cd ..

# 4. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicディレクトリにコピー中..."
mkdir -p public
rm -rf public/*
cp -rf frontend/dist/* public/
log_success "フロントエンドコピー完了"

# 5. PM2プロセス管理
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

# 6. 最終レポート
echo ""
echo -e "${GREEN}🎉 NO-GIT DEPLOY 完了！${NC}"
echo -e "${GREEN}============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "NO-GIT DEPLOY が正常に完了しました！"
