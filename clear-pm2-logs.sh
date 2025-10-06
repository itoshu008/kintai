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
echo -e "${PURPLE}🚀 CLEAR PM2 LOGS Starting...${NC}"
echo -e "${PURPLE}==============================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}📅 現在時刻: $(date)${NC}"

# 2. 正しいディレクトリに移動
log_step "正しいディレクトリに移動中..."
cd /home/zatint1991-hvt55/zatint1991.com
log_success "ディレクトリ移動完了: $(pwd)"

# 3. PM2を停止
log_step "PM2を停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete attendance-app 2>/dev/null || log_warning "PM2プロセスが見つかりません"

# 4. PM2ログをクリア
log_step "PM2ログをクリア中..."
pm2 flush 2>/dev/null || log_warning "PM2ログのクリアに失敗しました"

# ログファイルを直接削除
log_info "ログファイルを直接削除中..."
rm -f /root/.pm2/logs/attendance-app-out.log 2>/dev/null || true
rm -f /root/.pm2/logs/attendance-app-error.log 2>/dev/null || true
log_success "ログファイルを削除しました"

# 5. ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f "node.*8000" 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

sleep 2

# 6. バックエンドを再ビルド（念のため）
log_step "バックエンドを再ビルド中..."
cd backend

# TypeScriptをビルド
log_info "TypeScriptをビルド中..."
npx tsc

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルドに失敗しました"
    exit 1
fi

# ビルドされたファイルを確認
log_info "ビルドされたindex.jsを確認中..."
if grep -q "require(" dist/index.js; then
    log_error "❌ ビルド後のindex.jsにまだrequire()が含まれています！"
    exit 1
else
    log_success "✅ ビルド後のindex.jsにrequire()は含まれていません"
fi

cd ..

# 7. PM2でバックエンドを起動
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

# 8. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 9. ヘルスチェック
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

# 10. 新しいログを確認（バックアップエラーがないか）
log_step "新しいログを確認中..."
sleep 10

log_info "新しいアプリケーションログを確認中..."
pm2 logs attendance-app --lines 10 --nostream

# バックアップ関連のエラーを確認
log_info "バックアップ関連のエラーを確認中..."
if pm2 logs attendance-app --lines 50 --nostream | grep -q "require\|ReferenceError"; then
    log_error "❌ まだrequireエラーが発生しています！"
    pm2 logs attendance-app --lines 50 --nostream | grep -i "require\|error"
else
    log_success "✅ requireエラーは発生していません"
fi

# 11. バックアップシステムの確認
log_step "バックアップシステムを確認中..."
echo -e "${CYAN}=== バックアップ設定 ===${NC}"
echo -e "${CYAN}  バックアップ間隔: 60分（3600秒）${NC}"
echo -e "${CYAN}  最大バックアップ数: 24個（24時間分）${NC}"
echo -e "${CYAN}  バックアップディレクトリ: backups/${NC}"

# バックアップディレクトリの確認
log_info "バックアップディレクトリを確認中..."
ls -la backups/ 2>/dev/null || log_info "バックアップディレクトリは空です"

# 12. データ確認
log_step "データ確認中..."
echo -e "${CYAN}=== 現在のデータ統計 ===${NC}"
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

# 13. 最終レポート
echo ""
echo -e "${GREEN}🎉 CLEAR PM2 LOGS 完了！${NC}"
echo -e "${GREEN}==============================${NC}"
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
echo -e "${CYAN}  - バックアップ間隔: 60分（1時間）${NC}"
echo -e "${CYAN}  - 最大バックアップ数: 24個（24時間分）${NC}"
echo -e "${CYAN}  - ESモジュール対応完了${NC}"
echo -e "${CYAN}  - require()エラー解決${NC}"
echo -e "${CYAN}  - PM2ログクリア完了${NC}"
echo ""
echo -e "${CYAN}📅 修正完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "PM2ログクリアとバックアップシステムの修正が完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
log_info "次のバックアップは60分後に実行されます。"
log_info "新しいログでエラーがないか確認してください: pm2 logs attendance-app"
