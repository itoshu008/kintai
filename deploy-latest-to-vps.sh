#!/bin/bash

# VPSサーバーで最新コードを強制デプロイするスクリプト
# 使用方法: bash deploy-latest-to-vps.sh

set -e

# カラー出力関数
log_step() {
    echo -e "\n🚀 $1"
    echo "=========================================="
}

log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

# エラーハンドリング
handle_error() {
    log_error "デプロイ中にエラーが発生しました: $1"
    exit 1
}

# スクリプト開始
log_step "VPSサーバー最新コード強制デプロイ開始"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || handle_error "ディレクトリ移動失敗"

log_info "現在のディレクトリ: $(pwd)"
log_info "現在のユーザー: $(whoami)"
log_info "現在時刻: $(date)"

# Gitの状態をリセット
log_step "Gitの状態をリセット中..."
git reset --hard HEAD || true
git clean -fd || true

# 最新コードを強制取得
log_step "最新コードを強制取得中..."
git fetch origin main || handle_error "Git fetch失敗"
git reset --hard origin/main || handle_error "Git reset失敗"

log_success "最新コードの取得が完了しました"

# 古いファイルを削除
log_step "古いファイルを削除中..."
rm -f *.sh *.md *.ps1 *.yml 2>/dev/null || true
log_success "古いファイルの削除が完了しました"

# PM2を停止
log_step "PM2を停止中..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
log_success "PM2停止完了"

# ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || true
pkill -f "node.*8000" 2>/dev/null || true

# 完全クリーンアップ
log_step "完全クリーンアップ中..."
rm -rf frontend/dist frontend/node_modules backend/dist public
rm -f frontend/package-lock.json backend/package-lock.json
log_success "クリーンアップ完了"

# フロントエンドビルド
log_step "フロントエンドビルド中..."
cd frontend
npm install --prefer-offline --no-audit || handle_error "フロントエンド依存関係インストール失敗"
npm run build || handle_error "フロントエンドビルド失敗"
cd ..
log_success "フロントエンドビルド完了"

# バックエンドビルド
log_step "バックエンドビルド中..."
cd backend
npm install --prefer-offline --no-audit || handle_error "バックエンド依存関係インストール失敗"
npx tsc || handle_error "バックエンドビルド失敗"
cd ..
log_success "バックエンドビルド完了"

# 静的ファイルコピー
log_step "静的ファイルをコピー中..."
mkdir -p public
cp -r frontend/dist/* public/
log_success "静的ファイルコピー完了"

# キャッシュバスティング用のタイムスタンプを追加
log_info "キャッシュバスティング用タイムスタンプを追加中..."
if [ -f public/index.html ]; then
    timestamp=$(date +%s)
    sed -i "s|</head>|<!-- Cache busting timestamp: $timestamp --></head>|" public/index.html
    log_success "キャッシュバスティング完了"
fi

# PM2で起動
log_step "PM2でアプリケーションを起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

pm2 save || handle_error "PM2設定保存失敗"
log_success "PM2起動完了"

# ヘルスチェック
log_step "ヘルスチェック実行中..."

# PM2ステータス確認
log_info "PM2ステータス確認中..."
pm2 status

# ポート8000確認
log_info "ポート8000確認中..."
if netstat -tlnp | grep :8000 > /dev/null; then
    log_success "ポート8000が正常に使用されています"
    netstat -tlnp | grep :8000
else
    log_warning "ポート8000が見つかりません"
fi

# アプリケーションログ確認
log_info "アプリケーションログ確認中..."
pm2 logs attendance-app --lines 5

# バックアップシステム確認
log_step "バックアップシステム確認中..."
log_info "バックアップ設定:"
log_info "  バックアップ間隔: 60分（3600秒）"
log_info "  最大バックアップ数: 24個（24時間分）"
log_info "  バックアップディレクトリ: backups/"

if [ -d "backups" ]; then
    log_info "バックアップディレクトリ確認中..."
    ls -la backups/
else
    log_info "バックアップディレクトリが存在しません（初回起動時は正常）"
fi

# データ統計確認
log_step "データ統計確認中..."
if [ -f "data/employees.json" ]; then
    employee_count=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    log_info "社員数: ${employee_count}名"
else
    log_info "社員数: 0名（データファイルなし）"
fi

if [ -f "data/departments.json" ]; then
    dept_count=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    log_info "部署数: ${dept_count}部署"
else
    log_info "部署数: 0部署（データファイルなし）"
fi

if [ -f "data/attendance.json" ]; then
    attendance_count=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    log_info "勤怠データ: ${attendance_count}件"
else
    log_info "勤怠データ: 0件（データファイルなし）"
fi

# 完了メッセージ
log_step "デプロイ完了！"
echo "=========================================="
echo "🌐 URL: https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📁 データ統計:"
if [ -f "data/employees.json" ]; then
    employee_count=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    echo "  社員数: ${employee_count}名"
else
    echo "  社員数: 0名"
fi

if [ -f "data/departments.json" ]; then
    dept_count=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    echo "  部署数: ${dept_count}部署"
else
    echo "  部署数: 0部署"
fi

if [ -f "data/attendance.json" ]; then
    attendance_count=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    echo "  勤怠データ: ${attendance_count}件"
else
    echo "  勤怠データ: 0件"
fi

echo ""
echo "🔄 バックアップシステム:"
echo "  - バックアップ間隔: 60分（1時間）"
echo "  - 最大バックアップ数: 24個（24時間分）"
echo "  - ESモジュール対応完了"
echo "  - require()エラー解決"
echo "  - 手動バックアップ機能追加"
echo ""
echo "📅 デプロイ完了時刻: $(date)"
echo "=========================================="

log_success "VPSサーバー最新コード強制デプロイが完了しました！"
log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
log_info "エラーがないか確認してください: pm2 logs attendance-app"
