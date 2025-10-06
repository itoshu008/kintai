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
echo -e "${PURPLE}🚀 CLEAN VPS AND DEPLOY Starting...${NC}"
echo -e "${PURPLE}===================================${NC}"

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

# ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f "node.*8000" 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

sleep 2

# 4. 古いファイルを削除
log_step "古いファイルを削除中..."
rm -f clear-pm2-logs.sh 2>/dev/null || true
rm -f deploy-backup-60min.sh 2>/dev/null || true
rm -f deploy-backup-system.sh 2>/dev/null || true
rm -f deploy-clean-backend-pm2.sh 2>/dev/null || true
rm -f deploy-latest-data-pm2.sh 2>/dev/null || true
rm -f emergency-fix-500.sh 2>/dev/null || true
rm -f fix-500-error.sh 2>/dev/null || true
rm -f fix-60min-backup.sh 2>/dev/null || true
rm -f fix-backup-rebuild.sh 2>/dev/null || true
rm -f fix-employee-update-api.sh 2>/dev/null || true
rm -f fix-port-conflict.sh 2>/dev/null || true
rm -f investigate-pm2-data.sh 2>/dev/null || true
rm -f pm2-backend-fixed.sh 2>/dev/null || true
rm -f pm2-backend-latest.sh 2>/dev/null || true
rm -f restore-latest-data-pm2.sh 2>/dev/null || true
rm -f restore-pm2.sh 2>/dev/null || true
rm -f restore-previous-backup.sh 2>/dev/null || true
rm -f stabilize-backend.sh 2>/dev/null || true
rm -f start-backend-latest.sh 2>/dev/null || true

log_success "古いファイルを削除しました"

# 5. Gitの状態をリセット
log_step "Gitの状態をリセット中..."
git reset --hard HEAD 2>/dev/null || true
git clean -fd 2>/dev/null || true

# 6. 最新コードを取得
log_step "最新コードを取得中..."
if git pull origin main; then
    log_success "最新コードの取得が完了しました"
else
    log_warning "Git pullに失敗しました。強制的にリセットします..."
    git fetch origin main
    git reset --hard origin/main
    log_success "強制リセット完了"
fi

# 7. 完全クリーンアップ
log_step "完全クリーンアップを実行中..."
rm -rf frontend/dist 2>/dev/null || true
rm -rf frontend/node_modules/.vite 2>/dev/null || true
rm -rf backend/dist 2>/dev/null || true
rm -rf public 2>/dev/null || true
rm -rf frontend/node_modules 2>/dev/null || true
rm -rf backend/node_modules 2>/dev/null || true
rm -f frontend/package-lock.json 2>/dev/null || true
rm -f backend/package-lock.json 2>/dev/null || true

log_success "完全クリーンアップ完了"

# 8. フロントエンドをビルド
log_step "フロントエンドをビルド中..."
cd frontend

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true

# フロントエンドをビルド
log_info "フロントエンドをビルド中..."
npm run build

# ビルド結果確認
if [ ! -f "dist/index.html" ]; then
    log_error "フロントエンドビルドに失敗しました"
    exit 1
fi

log_success "フロントエンドビルド完了"
cd ..

# 9. バックエンドをビルド
log_step "バックエンドをビルド中..."
cd backend

# 依存関係をインストール
log_info "依存関係をインストール中..."
npm install --prefer-offline --no-audit 2>&1 | grep -v "EACCES" || true

# TypeScriptをビルド
log_info "TypeScriptをビルド中..."
npx tsc

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルドに失敗しました"
    exit 1
fi

log_success "バックエンドビルド完了"
cd ..

# 10. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicにコピー中..."
mkdir -p public
cp -r frontend/dist/* public/

log_success "フロントエンドコピー完了"

# 11. PM2でバックエンドを起動
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

# 12. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 13. ヘルスチェック
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
pm2 logs attendance-app --lines 10 --nostream

# 14. 最終レポート
echo ""
echo -e "${GREEN}🎉 CLEAN VPS AND DEPLOY 完了！${NC}"
echo -e "${GREEN}===================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}🆕 新機能確認:${NC}"
echo -e "${CYAN}  1. https://zatint1991.com/admin-dashboard-2024 にアクセス${NC}"
echo -e "${CYAN}  2. 右上のメニューボタンをクリック${NC}"
echo -e "${CYAN}  3. 「💾 バックアップ管理」を選択${NC}"
echo -e "${CYAN}  4. 手動バックアップ作成をテスト${NC}"
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "VPSクリーンアップとデプロイが完了しました！"
log_info "ブラウザのキャッシュをクリアしてからアクセスしてください。"
log_info "Ctrl+F5 または Cmd+Shift+R でハードリフレッシュを実行してください。"
