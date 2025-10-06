#!/bin/bash

# バックアップディレクトリ作成の問題をデバッグするスクリプト
# 使用方法: bash debug-backup-directory.sh

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
log_step "バックアップディレクトリ作成問題デバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# バックアップディレクトリの存在確認
log_step "バックアップディレクトリの存在確認中..."
log_info "バックアップディレクトリのパス: /home/zatint1991-hvt55/zatint1991.com/backups"

if [ -d "backups" ]; then
    log_success "バックアップディレクトリが存在します"
    log_info "バックアップディレクトリの内容:"
    ls -la backups/
    log_info "バックアップディレクトリの権限:"
    ls -ld backups/
else
    log_warning "バックアップディレクトリが存在しません"
    log_info "バックアップディレクトリを作成中..."
    mkdir -p backups
    chmod 755 backups
    log_success "バックアップディレクトリを作成しました"
fi

# データディレクトリの確認
log_step "データディレクトリの確認中..."
log_info "データディレクトリのパス: /home/zatint1991-hvt55/zatint1991.com/data"

if [ -d "data" ]; then
    log_success "データディレクトリが存在します"
    log_info "データディレクトリの内容:"
    ls -la data/
    log_info "データディレクトリの権限:"
    ls -ld data/
else
    log_error "データディレクトリが存在しません"
    log_info "データディレクトリを作成中..."
    mkdir -p data
    chmod 755 data
    log_success "データディレクトリを作成しました"
fi

# バックエンドのindex.jsでバックアップディレクトリのパスを確認
log_step "バックエンドコードでバックアップディレクトリのパスを確認中..."
log_info "バックエンドのindex.jsでバックアップディレクトリの設定を確認中..."

if grep -q "BACKUP_DIR" backend/dist/index.js; then
    log_info "バックアップディレクトリの設定:"
    grep -n "BACKUP_DIR" backend/dist/index.js
else
    log_warning "バックアップディレクトリの設定が見つかりません"
fi

# 手動でバックアップディレクトリを作成してテスト
log_step "手動でバックアップディレクトリを作成してテスト中..."
timestamp=$(date +"%Y-%m-%dT%H-%M-%S")
backup_name="manual_backup_${timestamp}"
backup_path="backups/${backup_name}"

log_info "テスト用バックアップディレクトリを作成中: $backup_path"
mkdir -p "$backup_path"
chmod 755 "$backup_path"

if [ -d "$backup_path" ]; then
    log_success "テスト用バックアップディレクトリが作成されました"
    
    # データファイルをコピーしてテスト
    log_info "データファイルをコピーしてテスト中..."
    if [ -f "data/employees.json" ]; then
        cp "data/employees.json" "$backup_path/"
        log_success "employees.jsonをコピーしました"
    else
        log_warning "employees.jsonが存在しません"
    fi
    
    if [ -f "data/departments.json" ]; then
        cp "data/departments.json" "$backup_path/"
        log_success "departments.jsonをコピーしました"
    else
        log_warning "departments.jsonが存在しません"
    fi
    
    if [ -f "data/attendance.json" ]; then
        cp "data/attendance.json" "$backup_path/"
        log_success "attendance.jsonをコピーしました"
    else
        log_warning "attendance.jsonが存在しません"
    fi
    
    log_info "テスト用バックアップディレクトリの内容:"
    ls -la "$backup_path"
    
    # テスト用バックアップディレクトリを削除
    rm -rf "$backup_path"
    log_info "テスト用バックアップディレクトリを削除しました"
else
    log_error "テスト用バックアップディレクトリの作成に失敗しました"
fi

# バックエンドのログを確認
log_step "バックエンドのログを確認中..."
log_info "最新の出力ログ:"
pm2 logs attendance-app --out --lines 20

log_info "最新のエラーログ:"
pm2 logs attendance-app --err --lines 20

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
            ls -la "backups/$backup_name"
        else
            log_error "バックアップディレクトリが存在しません: backups/$backup_name"
            
            # バックアップディレクトリの一覧を表示
            log_info "現在のバックアップディレクトリの内容:"
            ls -la backups/ 2>/dev/null || log_warning "バックアップディレクトリが存在しません"
        fi
    fi
fi

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="
log_info "デバッグ結果を確認してください"

if [ -d "backups" ]; then
    log_success "バックアップディレクトリは存在します"
    log_info "バックアップディレクトリの内容:"
    ls -la backups/
else
    log_error "バックアップディレクトリが存在しません"
fi

echo "=========================================="
