#!/bin/bash

# データファイルを復元するスクリプト
# 使用方法: bash restore-data-files.sh

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
log_step "データファイル復元開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# データディレクトリの確認
log_step "データディレクトリの現在の状態を確認中..."
log_info "データディレクトリの内容:"
ls -la data/

# バックアップファイルを確認
log_info "バックアップファイルの内容:"
if [ -f "data/employees.json.backup" ]; then
    log_info "employees.json.backup の内容:"
    head -5 data/employees.json.backup
    echo "..."
fi

if [ -f "data/departments.json.backup" ]; then
    log_info "departments.json.backup の内容:"
    head -5 data/departments.json.backup
    echo "..."
fi

if [ -f "data/attendance.json.backup" ]; then
    log_info "attendance.json.backup の内容:"
    head -5 data/attendance.json.backup
    echo "..."
fi

# バックアップファイルからデータファイルを復元
log_step "バックアップファイルからデータファイルを復元中..."

if [ -f "data/employees.json.backup" ]; then
    cp "data/employees.json.backup" "data/employees.json"
    log_success "employees.json を復元しました"
else
    log_warning "employees.json.backup が存在しません"
    # 空のemployees.jsonを作成
    echo "[]" > "data/employees.json"
    log_info "空の employees.json を作成しました"
fi

if [ -f "data/departments.json.backup" ]; then
    cp "data/departments.json.backup" "data/departments.json"
    log_success "departments.json を復元しました"
else
    log_warning "departments.json.backup が存在しません"
    # 空のdepartments.jsonを作成
    echo "[]" > "data/departments.json"
    log_info "空の departments.json を作成しました"
fi

if [ -f "data/attendance.json.backup" ]; then
    cp "data/attendance.json.backup" "data/attendance.json"
    log_success "attendance.json を復元しました"
else
    log_warning "attendance.json.backup が存在しません"
    # 空のattendance.jsonを作成
    echo "{}" > "data/attendance.json"
    log_info "空の attendance.json を作成しました"
fi

# その他の必要なファイルを作成
if [ ! -f "data/holidays.json" ]; then
    echo "{}" > "data/holidays.json"
    log_info "空の holidays.json を作成しました"
fi

if [ ! -f "data/remarks.json" ]; then
    echo "{}" > "data/remarks.json"
    log_info "空の remarks.json を作成しました"
fi

if [ ! -f "data/personal_pages.json" ]; then
    echo "{}" > "data/personal_pages.json"
    log_info "空の personal_pages.json を作成しました"
fi

# 復元後のデータディレクトリを確認
log_step "復元後のデータディレクトリを確認中..."
log_info "データディレクトリの内容:"
ls -la data/

# ファイルの内容を確認
log_info "復元されたファイルの内容確認:"

if [ -f "data/employees.json" ]; then
    employee_count=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    log_info "社員数: ${employee_count}名"
fi

if [ -f "data/departments.json" ]; then
    dept_count=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    log_info "部署数: ${dept_count}部署"
fi

if [ -f "data/attendance.json" ]; then
    attendance_count=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    log_info "勤怠データ: ${attendance_count}件"
fi

# バックアップ作成APIをテスト
log_step "バックアップ作成APIをテスト中..."
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

# バックアップ一覧を確認
log_step "バックアップ一覧を確認中..."
log_info "バックアップ一覧APIをテスト中 (GET /api/admin/backups)..."

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:8000/api/admin/backups")
http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

log_info "一覧API HTTPステータスコード: $http_status"
log_info "現在のバックアップ数: $(echo "$body" | jq '.backups | length' 2>/dev/null || echo "不明")"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

# 完了メッセージ
log_step "データファイル復元完了！"
echo "=========================================="
log_success "データファイルの復元が完了しました！"
log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
echo "=========================================="
