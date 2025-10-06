#!/bin/bash

# バックアップ作成APIのテストスクリプト
# 使用方法: bash test-backup-create.sh

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
log_step "バックアップ作成APIテスト開始"

log_info "現在時刻: $(date)"

# バックアップ一覧を確認
log_step "現在のバックアップ一覧を確認中..."
log_info "バックアップ一覧APIをテスト中 (GET /api/admin/backups)..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

log_info "HTTPステータスコード: $http_status"
log_info "現在のバックアップ数: $(echo "$body" | jq '.backups | length' 2>/dev/null || echo "不明")"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# 手動バックアップ作成APIをテスト
log_step "手動バックアップ作成APIをテスト中..."
log_info "手動バックアップ作成APIをテスト中 (POST /api/admin/backups/create)..."

create_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8000/api/admin/backups/create" -H "Content-Type: application/json" -d '{}')
create_http_status=$(echo "$create_response" | grep "HTTP_STATUS" | cut -d':' -f2)
create_body=$(echo "$create_response" | sed '/HTTP_STATUS/d')

log_info "作成API HTTPステータスコード: $create_http_status"
log_info "作成API レスポンスボディ: $create_body"

if [ "$create_http_status" = "200" ]; then
    log_success "手動バックアップ作成APIが正常に応答しています (200 OK)"
    echo "$create_body" | jq '.' 2>/dev/null || echo "$create_body"
    
    # バックアップ名を取得
    backup_name=$(echo "$create_body" | jq -r '.backupName' 2>/dev/null || echo "")
    if [ -n "$backup_name" ] && [ "$backup_name" != "null" ]; then
        log_success "バックアップが作成されました: $backup_name"
        
        # バックアップディレクトリを確認
        log_info "バックアップディレクトリを確認中..."
        if [ -d "/home/zatint1991-hvt55/zatint1991.com/backups/$backup_name" ]; then
            log_success "バックアップディレクトリが存在します: /home/zatint1991-hvt55/zatint1991.com/backups/$backup_name"
            ls -la "/home/zatint1991-hvt55/zatint1991.com/backups/$backup_name"
        else
            log_error "バックアップディレクトリが存在しません: /home/zatint1991-hvt55/zatint1991.com/backups/$backup_name"
        fi
        
        # バックアップ一覧を再確認
        log_info "バックアップ一覧を再確認中..."
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
        http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
        body=$(echo "$response" | sed '/HTTP_STATUS/d')
        
        log_info "更新後のバックアップ数: $(echo "$body" | jq '.backups | length' 2>/dev/null || echo "不明")"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        log_error "バックアップ名が取得できませんでした"
    fi
elif [ "$create_http_status" = "404" ]; then
    log_error "手動バックアップ作成APIが404エラーを返しています"
    echo "$create_body"
else
    log_warning "手動バックアップ作成APIが予期しないステータスコードを返しています: $create_http_status"
    echo "$create_body"
fi

# 最新のログを確認
log_step "最新のアプリケーションログを確認中..."
log_info "エラーログ:"
pm2 logs attendance-app --err --lines 10

log_info "出力ログ:"
pm2 logs attendance-app --out --lines 10

# データディレクトリを確認
log_step "データディレクトリを確認中..."
log_info "データディレクトリの内容:"
ls -la /home/zatint1991-hvt55/zatint1991.com/data/

log_info "バックアップディレクトリの内容:"
ls -la /home/zatint1991-hvt55/zatint1991.com/backups/ 2>/dev/null || log_warning "バックアップディレクトリが存在しません"

# 完了メッセージ
log_step "テスト完了！"
echo "=========================================="
log_info "テスト結果を確認してください"

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIが正常に動作しています！"
    log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
    log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
elif [ "$create_http_status" = "404" ]; then
    log_error "バックアップ作成APIが404エラーを返しています"
    log_info "バックエンドのコードを確認してください"
else
    log_warning "バックアップ作成APIが予期しないステータスコードを返しています: $create_http_status"
    log_info "PM2ログを確認してください: pm2 logs attendance-app"
fi

echo "=========================================="
