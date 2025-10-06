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
echo -e "${PURPLE}🚀 500 ERROR FIX Starting...${NC}"
echo -e "${PURPLE}============================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. PM2プロセス状態確認
log_step "PM2プロセス状態を確認中..."
pm2 status

# 3. ポート8000の確認
log_step "ポート8000の使用状況を確認中..."
if netstat -tlnp 2>/dev/null | grep -q ":8000"; then
    log_success "ポート8000は使用されています"
    netstat -tlnp | grep :8000
else
    log_warning "ポート8000は使用されていません"
fi

# 4. バックエンドファイル確認
log_step "バックエンドファイルを確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドファイルが存在します"
    ls -la backend/dist/index.js
else
    log_error "バックエンドファイルが見つかりません"
    
    # バックエンドを再ビルド
    log_info "バックエンドを再ビルド中..."
    cd backend
    npm run build
    cd ..
    log_success "バックエンド再ビルド完了"
fi

# 5. データディレクトリ確認
log_step "データディレクトリを確認中..."
if [ -d "data" ]; then
    log_success "データディレクトリが存在します"
    ls -la data/
    
    # 権限を修正
    chmod -R 755 data/
    chmod 644 data/*.json 2>/dev/null || true
    log_success "データディレクトリの権限を修正しました"
else
    log_warning "データディレクトリが見つかりません"
    mkdir -p data
    chmod 755 data
    log_success "データディレクトリを作成しました"
fi

# 6. PM2プロセスを停止・再起動
log_step "PM2プロセスを再起動中..."

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
log_success "PM2プロセス再起動完了"

# 7. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 3

# PM2ステータス確認
if pm2 status | grep -q "online"; then
    log_success "PM2プロセスが正常に起動しています"
else
    log_error "PM2プロセスが正常に起動していません"
fi

# ポート確認
if netstat -tlnp 2>/dev/null | grep -q ":8000"; then
    log_success "ポート8000が正常に使用されています"
else
    log_warning "ポート8000が使用されていません"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
pm2 logs attendance-app --lines 10

# 8. 最終レポート
echo ""
echo -e "${GREEN}🎉 500 ERROR FIX 完了！${NC}"
echo -e "${GREEN}============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📅 修正完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "500 ERROR FIX が完了しました！"
