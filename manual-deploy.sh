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
echo -e "${PURPLE}🚀 MANUAL DEPLOY Starting...${NC}"
echo -e "${PURPLE}============================${NC}"

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

# 4. PM2を停止
log_step "PM2を停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete attendance-app 2>/dev/null || log_warning "PM2プロセスが見つかりません"

# ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f "node.*8000" 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

sleep 2

# 5. フロントエンドをビルド
log_step "フロントエンドをビルド中..."
cd frontend

# 古いビルドを削除
log_info "古いビルドを削除中..."
rm -rf dist 2>/dev/null || true
rm -rf node_modules/.vite 2>/dev/null || true

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

# 6. バックエンドをビルド
log_step "バックエンドをビルド中..."
cd backend

# 古いビルドを削除
log_info "古いビルドを削除中..."
rm -rf dist 2>/dev/null || true

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

# 7. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicにコピー中..."
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/

log_success "フロントエンドコピー完了"

# 8. PM2でバックエンドを起動
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

# 9. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 10. ヘルスチェック
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

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 MANUAL DEPLOY 完了！${NC}"
echo -e "${GREEN}============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 ビルド結果:${NC}"
echo -e "${CYAN}  - フロントエンド: frontend/dist/ ✅${NC}"
echo -e "${CYAN}  - バックエンド: backend/dist/ ✅${NC}"
echo -e "${CYAN}  - 静的ファイル: public/ ✅${NC}"
echo ""
echo -e "${CYAN}🆕 新機能:${NC}"
echo -e "${CYAN}  - マスターページにバックアップ管理機能を追加${NC}"
echo -e "${CYAN}  - 手動バックアップ作成・復元・削除${NC}"
echo -e "${CYAN}  - リアルタイム更新機能${NC}"
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "手動デプロイが完了しました！"
log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください。"
log_info "右上のメニューから「💾 バックアップ管理」を選択して新機能をテストしてください。"
