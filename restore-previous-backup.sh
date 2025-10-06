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
echo -e "${PURPLE}🚀 RESTORE PREVIOUS BACKUP Starting...${NC}"
echo -e "${PURPLE}======================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}📅 現在時刻: $(date)${NC}"

# 2. 正しいディレクトリに移動
log_step "正しいディレクトリに移動中..."
cd /home/zatint1991-hvt55/zatint1991.com
log_success "ディレクトリ移動完了: $(pwd)"

# 3. バックアップ一覧を確認
log_step "バックアップ一覧を確認中..."
if [ ! -d "backups" ]; then
    log_error "バックアップディレクトリが見つかりません"
    exit 1
fi

# バックアップ一覧を取得（作成日時順）
BACKUP_LIST=($(ls -1t backups/ | head -10))
if [ ${#BACKUP_LIST[@]} -eq 0 ]; then
    log_error "バックアップが見つかりません"
    exit 1
fi

echo -e "${CYAN}=== 利用可能なバックアップ ===${NC}"
for i in "${!BACKUP_LIST[@]}"; do
    BACKUP_NAME="${BACKUP_LIST[$i]}"
    BACKUP_PATH="backups/$BACKUP_NAME"
    if [ -d "$BACKUP_PATH" ]; then
        BACKUP_DATE=$(stat -c %y "$BACKUP_PATH" 2>/dev/null | cut -d' ' -f1-2)
        BACKUP_SIZE=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)
        echo -e "${CYAN}  $((i+1)). $BACKUP_NAME (${BACKUP_SIZE}) - $BACKUP_DATE${NC}"
    fi
done

# 4. 一個前のバックアップを選択
if [ ${#BACKUP_LIST[@]} -ge 2 ]; then
    PREVIOUS_BACKUP="${BACKUP_LIST[1]}"  # 2番目（一個前）
    log_info "一個前のバックアップを選択: $PREVIOUS_BACKUP"
else
    log_warning "一個前のバックアップが見つかりません。最新のバックアップを使用します。"
    PREVIOUS_BACKUP="${BACKUP_LIST[0]}"  # 最新
fi

echo -e "${CYAN}復元するバックアップ: $PREVIOUS_BACKUP${NC}"

# 5. PM2を停止
log_step "PM2を停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "PM2プロセスが見つかりません"

# 6. 現在のデータをバックアップ（安全のため）
log_step "現在のデータをバックアップ中..."
CURRENT_BACKUP="data.current.$(date +%Y%m%d_%H%M%S)"
if [ -d "data" ] && [ "$(ls -A data 2>/dev/null)" ]; then
    cp -r data "$CURRENT_BACKUP"
    log_success "現在のデータをバックアップ: $CURRENT_BACKUP"
else
    log_warning "現在のデータディレクトリが空です"
fi

# 7. バックアップからデータを復元
log_step "バックアップからデータを復元中..."
BACKUP_PATH="backups/$PREVIOUS_BACKUP"

if [ ! -d "$BACKUP_PATH" ]; then
    log_error "バックアップが見つかりません: $BACKUP_PATH"
    exit 1
fi

# データディレクトリを準備
mkdir -p data

# バックアップからデータを復元
log_info "データファイルを復元中..."
cp -r "$BACKUP_PATH"/* data/ 2>/dev/null || {
    log_error "バックアップからの復元に失敗しました"
    exit 1
}

# 権限を設定
chmod -R 755 data/

log_success "データ復元完了: $PREVIOUS_BACKUP"

# 8. 復元されたデータを確認
log_step "復元されたデータを確認中..."
echo -e "${CYAN}=== 復元されたデータ統計 ===${NC}"
if [ -f "data/employees.json" ]; then
    EMPLOYEES_COUNT=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
    
    # 社員データの詳細を表示（最初の3名）
    echo -e "${CYAN}  社員データ（最初の3名）:${NC}"
    cat data/employees.json | jq '.[0:3] | .[] | "    - \(.name) (\(.code))"' 2>/dev/null || echo "    JSON解析エラー"
fi

if [ -f "data/departments.json" ]; then
    DEPARTMENTS_COUNT=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
    
    # 部署データの詳細を表示
    echo -e "${CYAN}  部署データ:${NC}"
    cat data/departments.json | jq '.[] | "    - \(.name)"' 2>/dev/null || echo "    JSON解析エラー"
fi

if [ -f "data/attendance.json" ]; then
    ATTENDANCE_COUNT=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
fi

# 9. バックエンドをビルド
log_step "バックエンドをビルド中..."
cd backend

# node_modulesをクリーンアップ
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# TypeScriptをビルド
log_info "TypeScriptをビルド中..."
rm -rf dist 2>/dev/null || true
npx tsc

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルドに失敗しました"
    exit 1
fi

log_success "バックエンドビルド完了"
cd ..

# 10. フロントエンドをビルド
log_step "フロントエンドをビルド中..."
cd frontend

# node_modulesをクリーンアップ
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# フロントエンドをビルド
log_info "フロントエンドをビルド中..."
rm -rf dist 2>/dev/null || true
npm run build

# ビルド結果確認
if [ ! -f "dist/index.html" ]; then
    log_error "フロントエンドビルドに失敗しました"
    exit 1
fi

log_success "フロントエンドビルド完了"
cd ..

# 11. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicにコピー中..."
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/

log_success "フロントエンドコピー完了"

# 12. PM2でバックエンドを起動
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

# 13. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 14. ヘルスチェック
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

# 15. 最終レポート
echo ""
echo -e "${GREEN}🎉 RESTORE PREVIOUS BACKUP 完了！${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 復元されたデータ統計:${NC}"
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
echo -e "${CYAN}🔄 復元されたバックアップ: $PREVIOUS_BACKUP${NC}"
echo -e "${CYAN}💾 現在のデータバックアップ: $CURRENT_BACKUP${NC}"
echo ""
echo -e "${CYAN}📅 復元完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "一個前のバックアップの復元が完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
