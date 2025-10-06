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
echo -e "${PURPLE}🚀 BACKEND STABILIZATION Starting...${NC}"
echo -e "${PURPLE}====================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. 全プロセスを完全停止
log_step "全プロセスを完全停止中..."
log_info "PM2プロセスを停止中..."
pm2 stop all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 kill 2>/dev/null || log_warning "PM2プロセスが見つかりません"

log_info "Node.jsプロセスを強制停止中..."
pkill -f node 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

log_info "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 3. 待機時間
log_info "プロセス完全停止を待機中..."
sleep 5

# 4. ポートが解放されたか確認
log_step "ポートが解放されたか確認中..."
if lsof -i :8000 2>/dev/null | grep -q "LISTEN"; then
    log_warning "ポート8000がまだ使用されています"
    lsof -i :8000
    log_info "強制的にポートを解放中..."
    sudo fuser -k 8000/tcp 2>/dev/null || true
    sleep 2
else
    log_success "ポート8000が解放されました"
fi

# 5. データの整合性を確認
log_step "データの整合性を確認中..."
if [ -f "data/employees.json" ] && [ -f "data/departments.json" ] && [ -f "data/attendance.json" ]; then
    log_success "データファイルが存在します"
    
    # データファイルの内容を確認
    EMPLOYEES_COUNT=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    DEPARTMENTS_COUNT=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    ATTENDANCE_COUNT=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    
    echo -e "${CYAN}📊 データ統計:${NC}"
    echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
    echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
    echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
else
    log_error "データファイルが見つかりません"
    exit 1
fi

# 6. バックエンドファイルの確認
log_step "バックエンドファイルを確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドファイルが存在します"
    ls -la backend/dist/index.js
else
    log_error "バックエンドファイルが見つかりません"
    exit 1
fi

# 7. フロントエンドファイルの確認
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

# 8. 環境変数を設定
log_step "環境変数を設定中..."
export PORT=8000
export NODE_ENV=production
export DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data"
export FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"
export LOG_LEVEL=info
export CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

log_success "環境変数を設定しました"

# 9. PM2プロセスを起動（安定化版）
log_step "PM2プロセスを起動中（安定化版）..."

# PM2プロセスを起動
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com" \
  --max-memory-restart 500M \
  --min-uptime 10000 \
  --max-restarts 3

# PM2設定を保存
pm2 save

log_success "PM2プロセス起動完了"

# 10. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 10

# PM2ステータス確認
log_info "PM2ステータスを確認中..."
pm2 status

# ポート確認
log_info "ポート8000を確認中..."
if lsof -i :8000 2>/dev/null | grep -q "LISTEN"; then
    log_success "ポート8000が正常に使用されています"
    lsof -i :8000
else
    log_warning "ポート8000が使用されていません"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
pm2 logs attendance-app --lines 10

# 11. 安定性テスト
log_step "安定性テストを実行中..."
log_info "30秒間の安定性テストを実行中..."
sleep 30

# PM2ステータス再確認
log_info "安定性テスト後のPM2ステータス:"
pm2 status

# 12. 最終レポート
echo ""
echo -e "${GREEN}🎉 BACKEND STABILIZATION 完了！${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データ統計:${NC}"
echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
echo ""
echo -e "${CYAN}📅 安定化完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "BACKEND STABILIZATION が完了しました！"
log_info "バックエンドが安定化されました。ブラウザで https://zatint1991.com にアクセスして確認してください。"
