#!/bin/bash

# バックアップAPIエンドポイントのテストスクリプト
# 使用方法: bash test-backup-api.sh

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

# スクリプト開始
log_step "バックアップAPIエンドポイントテスト開始"

log_info "現在時刻: $(date)"

# PM2ログをクリア
log_step "PM2ログをクリア中..."
pm2 flush
log_success "PM2ログクリア完了"

# PM2を再起動
log_step "PM2を再起動中..."
pm2 restart attendance-app
sleep 5
log_success "PM2再起動完了"

# ヘルスチェック
log_step "ヘルスチェック実行中..."
log_info "ヘルスAPIをテスト中..."
if curl -s "http://localhost:8000/api/health" > /dev/null; then
    log_success "ヘルスAPIが正常に応答しています"
    curl -s "http://localhost:8000/api/health"
    echo ""
else
    log_error "ヘルスAPIが応答しません"
fi

# バックアップAPIをテスト
log_step "バックアップAPIテスト中..."
log_info "バックアップ一覧APIをテスト中 (GET /api/admin/backups)..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

log_info "HTTPステータスコード: $http_status"
log_info "レスポンスボディ: $body"

if [ "$http_status" = "200" ]; then
    log_success "バックアップ一覧APIが正常に応答しています (200 OK)"
    echo "$body" | head -c 500
    echo ""
elif [ "$http_status" = "404" ]; then
    log_error "バックアップ一覧APIが404エラーを返しています"
    echo "$body"
else
    log_warning "バックアップ一覧APIが予期しないステータスコードを返しています: $http_status"
    echo "$body"
fi

# 最新のログを確認
log_step "最新のアプリケーションログを確認中..."
log_info "エラーログ:"
pm2 logs attendance-app --err --lines 5

log_info "出力ログ:"
pm2 logs attendance-app --out --lines 5

# バックエンドのindex.jsを直接確認
log_step "バックエンドのindex.jsを直接確認中..."
log_info "バックアップAPIエンドポイントの行番号:"
grep -n "app.get('/api/admin/backups'" /home/zatint1991-hvt55/zatint1991.com/backend/dist/index.js

log_info "ワイルドカードルートの行番号:"
grep -n "app.get('\*'" /home/zatint1991-hvt55/zatint1991.com/backend/dist/index.js

# 完了メッセージ
log_step "テスト完了！"
echo "=========================================="
log_info "テスト結果を確認してください"

if [ "$http_status" = "200" ]; then
    log_success "バックアップAPIが正常に動作しています！"
    log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
    log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
elif [ "$http_status" = "404" ]; then
    log_error "バックアップAPIが404エラーを返しています"
    log_info "バックエンドのコードを確認してください:"
    log_info "  cat /home/zatint1991-hvt55/zatint1991.com/backend/dist/index.js | grep -A 5 'api/admin/backups'"
else
    log_warning "バックアップAPIが予期しないステータスコードを返しています: $http_status"
    log_info "PM2ログを確認してください: pm2 logs attendance-app"
fi

echo "=========================================="
