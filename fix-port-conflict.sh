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
echo -e "${RED}🚨 PORT CONFLICT FIX Starting...${NC}"
echo -e "${RED}===============================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. ポート8000を使用しているプロセスを特定
log_step "ポート8000を使用しているプロセスを特定中..."
echo -e "${CYAN}🔍 ポート8000の使用状況:${NC}"
netstat -tlnp | grep :8000 || log_warning "ポート8000にプロセスが見つかりません"

echo -e "${CYAN}🔍 ポート8000を使用しているプロセス:${NC}"
lsof -i :8000 2>/dev/null || log_warning "lsofコマンドが利用できません"

# 3. 全PM2プロセスを強制停止
log_step "全PM2プロセスを強制停止中..."
log_info "PM2プロセスを停止中..."
pm2 stop all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 kill 2>/dev/null || log_warning "PM2プロセスが見つかりません"

# 4. ポート8000を強制解放
log_step "ポート8000を強制解放中..."
log_info "ポート8000を使用しているプロセスを強制終了中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 5. Node.jsプロセスを強制停止
log_step "Node.jsプロセスを強制停止中..."
log_info "Node.jsプロセスを強制終了中..."
pkill -f node 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

# 6. ポートが解放されたか確認
log_step "ポートが解放されたか確認中..."
sleep 2
if netstat -tlnp | grep -q :8000; then
    log_warning "ポート8000がまだ使用されています"
    echo -e "${CYAN}🔍 残っているプロセス:${NC}"
    netstat -tlnp | grep :8000
    lsof -i :8000 2>/dev/null || true
else
    log_success "ポート8000が解放されました"
fi

# 7. 環境変数を設定
log_step "環境変数を設定中..."
export PORT=8000
export NODE_ENV=production
export DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data"
export FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"
export LOG_LEVEL=info
export CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

log_success "環境変数を設定しました"
echo -e "${CYAN}🌍 設定された環境変数:${NC}"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DATA_DIR: $DATA_DIR"
echo "FRONTEND_PATH: $FRONTEND_PATH"
echo "LOG_LEVEL: $LOG_LEVEL"
echo "CORS_ORIGIN: $CORS_ORIGIN"

# 8. データディレクトリの確認
log_step "データディレクトリを確認中..."
if [ -d "data" ]; then
    log_success "データディレクトリが存在します"
    ls -la data/
else
    log_error "データディレクトリが見つかりません"
    exit 1
fi

# 9. バックエンドファイルの確認
log_step "バックエンドファイルを確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドファイルが存在します"
    ls -la backend/dist/index.js
else
    log_error "バックエンドファイルが見つかりません"
    exit 1
fi

# 10. フロントエンドファイルの確認
log_step "フロントエンドファイルを確認中..."
if [ -d "public" ] && [ -f "public/index.html" ]; then
    log_success "フロントエンドファイルが存在します"
    ls -la public/index.html
else
    log_warning "フロントエンドファイルが見つかりません。再ビルドします..."
    
    # フロントエンドを再ビルド
    cd frontend
    npm run build
    cd ..
    
    # publicディレクトリにコピー
    mkdir -p public
    cp -r frontend/dist/* public/
    log_success "フロントエンド再ビルドとコピー完了"
fi

# 11. PM2プロセスを起動
log_step "PM2プロセスを起動中..."
log_info "新しいPM2プロセスを起動中..."

# PM2プロセスを起動（環境変数を明示的に設定）
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2設定を保存
pm2 save

log_success "PM2プロセス起動完了"

# 12. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 5

# PM2ステータス確認
log_info "PM2ステータスを確認中..."
pm2 status

# ポート確認
log_info "ポート8000を確認中..."
if netstat -tlnp | grep -q ":8000"; then
    log_success "ポート8000が正常に使用されています"
    netstat -tlnp | grep :8000
else
    log_warning "ポート8000が使用されていません"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
pm2 logs attendance-app --lines 10

# 13. 最終レポート
echo ""
echo -e "${GREEN}🎉 PORT CONFLICT FIX 完了！${NC}"
echo -e "${GREEN}===============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データディレクトリ:${NC}"
ls -la data/
echo ""
echo -e "${CYAN}📅 修正完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "PORT CONFLICT FIX が完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
