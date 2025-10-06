#!/bin/bash

# バックアップ作成結果を確認するスクリプト
# 使用方法: bash check-backup-results.sh

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
log_step "バックアップ作成結果確認開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# バックアップディレクトリの詳細確認
log_step "バックアップディレクトリの詳細確認中..."
log_info "バックアップディレクトリの内容:"
ls -la backups/

# バックアップディレクトリ内のサブディレクトリを確認
log_info "バックアップディレクトリ内のサブディレクトリ:"
find backups/ -type d -name "manual_backup_*" 2>/dev/null || log_warning "manual_backup_* ディレクトリが見つかりません"

# 最新のバックアップディレクトリを特定
log_step "最新のバックアップディレクトリを特定中..."
latest_backup=$(find backups/ -type d -name "manual_backup_*" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

if [ -n "$latest_backup" ]; then
    log_success "最新のバックアップディレクトリ: $latest_backup"
    log_info "最新バックアップディレクトリの内容:"
    ls -la "$latest_backup"
    
    # バックアップファイルの詳細確認
    log_info "バックアップファイルの詳細:"
    if [ -f "$latest_backup/employees.json" ]; then
        employee_count=$(cat "$latest_backup/employees.json" | jq '. | length' 2>/dev/null || echo "0")
        log_info "バックアップ内の社員数: ${employee_count}名"
    fi
    
    if [ -f "$latest_backup/departments.json" ]; then
        dept_count=$(cat "$latest_backup/departments.json" | jq '. | length' 2>/dev/null || echo "0")
        log_info "バックアップ内の部署数: ${dept_count}部署"
    fi
    
    if [ -f "$latest_backup/attendance.json" ]; then
        attendance_count=$(cat "$latest_backup/attendance.json" | jq 'keys | length' 2>/dev/null || echo "0")
        log_info "バックアップ内の勤怠データ: ${attendance_count}件"
    fi
else
    log_warning "バックアップディレクトリが見つかりません"
fi

# バックアップ一覧APIをテスト
log_step "バックアップ一覧APIをテスト中..."
log_info "バックアップ一覧APIをテスト中 (GET /api/admin/backups)..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

log_info "一覧API HTTPステータスコード: $http_status"
log_info "現在のバックアップ数: $(echo "$body" | jq '.backups | length' 2>/dev/null || echo "不明")"

if [ "$http_status" = "200" ]; then
    log_success "バックアップ一覧APIが正常に応答しています"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    log_error "バックアップ一覧APIがエラーを返しています: $http_status"
    echo "$body"
fi

# バックアップ作成APIを再テスト
log_step "バックアップ作成APIを再テスト中..."
log_info "手動バックアップ作成APIをテスト中 (POST /api/admin/backups/create)..."

create_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8000/api/admin/backups/create" -H "Content-Type: application/json" -d '{}')
create_http_status=$(echo "$create_response" | grep "HTTP_STATUS" | cut -d':' -f2)
create_body=$(echo "$create_response" | sed '/HTTP_STATUS/d')

log_info "作成API HTTPステータスコード: $create_http_status"
log_info "作成API レスポンスボディ: $create_body"

if [ "$create_http_status" = "200" ]; then
    log_success "手動バックアップ作成APIが正常に応答しています"
    
    # バックアップ名を取得
    backup_name=$(echo "$create_body" | jq -r '.backupName' 2>/dev/null || echo "")
    if [ -n "$backup_name" ] && [ "$backup_name" != "null" ]; then
        log_info "作成されたバックアップ名: $backup_name"
        
        # バックアップディレクトリを確認
        if [ -d "backups/$backup_name" ]; then
            log_success "バックアップディレクトリが存在します: backups/$backup_name"
            log_info "バックアップディレクトリの内容:"
            ls -la "backups/$backup_name"
        else
            log_error "バックアップディレクトリが存在しません: backups/$backup_name"
        fi
    fi
else
    log_error "手動バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

# バックアップ一覧を再確認
log_step "バックアップ一覧を再確認中..."
log_info "バックアップ一覧APIをテスト中 (GET /api/admin/backups)..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

log_info "一覧API HTTPステータスコード: $http_status"
log_info "現在のバックアップ数: $(echo "$body" | jq '.backups | length' 2>/dev/null || echo "不明")"

if [ "$http_status" = "200" ]; then
    log_success "バックアップ一覧APIが正常に応答しています"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    log_error "バックアップ一覧APIがエラーを返しています: $http_status"
    echo "$body"
fi

# 完了メッセージ
log_step "確認完了！"
echo "=========================================="

if [ -n "$latest_backup" ] && [ -d "$latest_backup" ]; then
    log_success "バックアップが正常に作成されています！"
    log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
    log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
else
    log_warning "バックアップディレクトリが見つかりません"
    log_info "バックエンドのログを確認してください: pm2 logs attendance-app"
fi

echo "=========================================="
