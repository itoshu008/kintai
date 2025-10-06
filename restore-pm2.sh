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
echo -e "${PURPLE}🚀 PM2 RESTORE Starting...${NC}"
echo -e "${PURPLE}===========================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. PM2の存在確認
log_step "PM2の存在を確認中..."
if command -v pm2 &> /dev/null; then
    log_success "PM2がインストールされています"
    pm2 --version
else
    log_warning "PM2がインストールされていません"
fi

# 3. Node.jsの確認
log_step "Node.jsの存在を確認中..."
if command -v node &> /dev/null; then
    log_success "Node.jsがインストールされています"
    node --version
else
    log_error "Node.jsがインストールされていません"
    exit 1
fi

# 4. npmの確認
log_step "npmの存在を確認中..."
if command -v npm &> /dev/null; then
    log_success "npmがインストールされています"
    npm --version
else
    log_error "npmがインストールされていません"
    exit 1
fi

# 5. PM2をグローバルインストール
log_step "PM2をグローバルインストール中..."
log_info "PM2をインストール中..."
npm install -g pm2

# 6. PM2のインストール確認
log_step "PM2のインストール確認中..."
if command -v pm2 &> /dev/null; then
    log_success "PM2のインストールが完了しました"
    pm2 --version
else
    log_error "PM2のインストールに失敗しました"
    exit 1
fi

# 7. PM2の初期化
log_step "PM2を初期化中..."
pm2 kill 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 startup 2>/dev/null || log_warning "PM2 startup設定をスキップします"

# 8. 既存のプロセスを確認
log_step "既存のプロセスを確認中..."
pm2 list

# 9. バックエンドファイルの確認
log_step "バックエンドファイルを確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドファイルが存在します"
    ls -la backend/dist/index.js
else
    log_error "バックエンドファイルが見つかりません"
    exit 1
fi

# 10. データファイルの確認
log_step "データファイルを確認中..."
if [ -f "data/employees.json" ] && [ -f "data/departments.json" ] && [ -f "data/attendance.json" ]; then
    log_success "データファイルが存在します"
    
    # データ統計を表示
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

# 11. フロントエンドファイルの確認
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

# 12. ポート8000を解放
log_step "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f node 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

# 13. PM2プロセスを起動
log_step "PM2プロセスを起動中..."
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

# 14. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 15. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 5

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

# 16. 最終レポート
echo ""
echo -e "${GREEN}🎉 PM2 RESTORE 完了！${NC}"
echo -e "${GREEN}===========================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データ統計:${NC}"
echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
echo ""
echo -e "${CYAN}📅 復旧完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "PM2 RESTORE が完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
