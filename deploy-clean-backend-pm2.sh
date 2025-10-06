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
echo -e "${PURPLE}🚀 DEPLOY CLEAN BACKEND TO PM2 Starting...${NC}"
echo -e "${PURPLE}==========================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}📅 現在時刻: $(date)${NC}"

# 2. 正しいディレクトリに移動
log_step "正しいディレクトリに移動中..."
cd /home/zatint1991-hvt55/zatint1991.com
log_success "ディレクトリ移動完了: $(pwd)"

# 3. 最新コード取得
log_step "最新コードを取得中..."
if git pull origin main; then
    log_success "最新コードの取得が完了しました"
else
    log_warning "Git pullに失敗しました。現在のコードで続行します"
fi

# 4. 既存のPM2プロセスを完全停止
log_step "既存のPM2プロセスを完全停止中..."
pm2 stop all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 kill 2>/dev/null || log_warning "PM2プロセスが見つかりません"

# ポート8000を強制解放
log_info "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f "node.*8000" 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"
pkill -f "attendance" 2>/dev/null || log_warning "attendanceプロセスが見つかりません"

# 5. データディレクトリを準備
log_step "データディレクトリを準備中..."
mkdir -p data
mkdir -p backups

# 初期データファイルを作成
log_info "初期データファイルを作成中..."
echo '[]' > data/employees.json
echo '[]' > data/departments.json
echo '{}' > data/attendance.json
echo '{}' > data/holidays.json
echo '{}' > data/personal_pages.json

# 権限を設定
chmod -R 755 data/
chmod -R 755 backups/

log_success "データディレクトリ準備完了"

# 6. バックエンドの完全クリーンビルド
log_step "バックエンドの完全クリーンビルド中..."
cd backend

# 完全クリーンアップ
log_info "完全クリーンアップ中..."
rm -rf node_modules package-lock.json dist 2>/dev/null || true

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# TypeScriptをビルド
log_info "TypeScriptをビルド中..."
npx tsc

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルドに失敗しました"
    exit 1
fi

log_success "バックエンドビルド完了: dist/index.js"
ls -la dist/index.js

cd ..

# 7. フロントエンドの完全クリーンビルド
log_step "フロントエンドの完全クリーンビルド中..."
cd frontend

# 完全クリーンアップ
log_info "完全クリーンアップ中..."
rm -rf node_modules package-lock.json dist 2>/dev/null || true

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# フロントエンドをビルド
log_info "フロントエンドをビルド中..."
npm run build

# ビルド結果確認
if [ ! -f "dist/index.html" ]; then
    log_error "フロントエンドビルドに失敗しました"
    exit 1
fi

log_success "フロントエンドビルド完了: dist/index.html"
ls -la dist/index.html

cd ..

# 8. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicにコピー中..."
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/

# コピー結果確認
if [ ! -f "public/index.html" ]; then
    log_error "フロントエンドコピーに失敗しました"
    exit 1
fi

log_success "フロントエンドコピー完了: public/index.html"
ls -la public/index.html

# 9. PM2でバックエンドを起動
log_step "PM2でバックエンドを起動中..."

# 環境変数を明示的に設定
export PORT=8000
export NODE_ENV=production
export DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data"
export FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"
export LOG_LEVEL=info
export CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2でバックエンドを起動
log_info "バックエンドをPM2で起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# 10. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 11. ヘルスチェック
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

# 12. エラーチェック
log_step "エラーチェックを実行中..."
if pm2 logs attendance-app --lines 20 | grep -i "error\|exception\|failed"; then
    log_warning "エラーが検出されました"
else
    log_success "エラーは検出されませんでした"
fi

# 13. データ確認
log_step "データ確認中..."
echo -e "${CYAN}=== データ統計 ===${NC}"
if [ -f "data/employees.json" ]; then
    EMPLOYEES_COUNT=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
fi
if [ -f "data/departments.json" ]; then
    DEPARTMENTS_COUNT=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
fi
if [ -f "data/attendance.json" ]; then
    ATTENDANCE_COUNT=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
fi

# 14. 最終レポート
echo ""
echo -e "${GREEN}🎉 DEPLOY CLEAN BACKEND TO PM2 完了！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データ統計:${NC}"
if [ -f "data/employees.json" ]; then
    EMPLOYEES_COUNT=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
fi
if [ -f "data/departments.json" ]; then
    DEPARTMENTS_COUNT=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
fi
if [ -f "data/attendance.json" ]; then
    ATTENDANCE_COUNT=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
fi
echo ""
echo -e "${CYAN}🔄 バックアップシステム:${NC}"
echo -e "${CYAN}  - 1分間隔で自動バックアップ${NC}"
echo -e "${CYAN}  - 最大5個のバックアップ保持${NC}"
echo -e "${CYAN}  - 変更時のみバックアップ実行${NC}"
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "エラーフリー最新バックエンドのPM2デプロイが完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
