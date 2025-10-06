#!/bin/bash

# バックアップ作成時のエラーをデバッグするスクリプト
# 使用方法: bash debug-backup-creation.sh

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
log_step "バックアップ作成エラーデバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# バックエンドのログをクリア
log_step "バックエンドのログをクリア中..."
pm2 flush
log_success "ログクリア完了"

# バックアップディレクトリの確認
log_step "バックアップディレクトリの状態を確認中..."
log_info "バックアップディレクトリの内容:"
ls -la backups/ 2>/dev/null || log_warning "バックアップディレクトリが存在しません"

# バックエンドのindex.jsでバックアップディレクトリのパスを確認
log_step "バックエンドコードでバックアップディレクトリのパスを確認中..."
log_info "DATA_DIRの設定:"
grep -n "DATA_DIR" backend/dist/index.js | head -3

log_info "BACKUP_DIRの設定:"
grep -n "BACKUP_DIR" backend/dist/index.js | head -3

# 実際のパスを計算
log_info "実際のパスを計算中..."
data_dir="/home/zatint1991-hvt55/zatint1991.com/data"
backup_dir="/home/zatint1991-hvt55/zatint1991.com/backups"

log_info "DATA_DIR: $data_dir"
log_info "BACKUP_DIR: $backup_dir"

# ディレクトリの存在確認
if [ -d "$data_dir" ]; then
    log_success "DATA_DIRが存在します: $data_dir"
else
    log_error "DATA_DIRが存在しません: $data_dir"
fi

if [ -d "$backup_dir" ]; then
    log_success "BACKUP_DIRが存在します: $backup_dir"
else
    log_warning "BACKUP_DIRが存在しません: $backup_dir"
    log_info "BACKUP_DIRを作成中..."
    mkdir -p "$backup_dir"
    chmod 755 "$backup_dir"
    log_success "BACKUP_DIRを作成しました: $backup_dir"
fi

# バックアップ作成APIをテスト（ログを監視しながら）
log_step "バックアップ作成APIをテスト中（ログ監視付き）..."

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > /tmp/pm2_logs.txt 2>&1 &
log_pid=$!

# 少し待機
sleep 2

# バックアップ作成APIを実行
log_info "手動バックアップ作成APIを実行中..."
create_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8000/api/admin/backups/create" -H "Content-Type: application/json" -d '{}')
create_http_status=$(echo "$create_response" | grep "HTTP_STATUS" | cut -d':' -f2)
create_body=$(echo "$create_response" | sed '/HTTP_STATUS/d')

log_info "作成API HTTPステータスコード: $create_http_status"
log_info "作成API レスポンスボディ: $create_body"

# ログ監視を停止
kill $log_pid 2>/dev/null || true
sleep 1

# 最新のログを確認
log_step "最新のログを確認中..."
log_info "最新の出力ログ:"
pm2 logs attendance-app --out --lines 20

log_info "最新のエラーログ:"
pm2 logs attendance-app --err --lines 20

# バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la backups/ 2>/dev/null || log_warning "バックアップディレクトリが存在しません"

# バックアップ作成の詳細ログを確認
log_step "バックアップ作成の詳細ログを確認中..."
if [ -f "/tmp/pm2_logs.txt" ]; then
    log_info "ログファイルの内容:"
    cat /tmp/pm2_logs.txt
    rm -f /tmp/pm2_logs.txt
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
    fi
    
    if [ -f "data/departments.json" ]; then
        cp "data/departments.json" "$backup_path/"
        log_success "departments.jsonをコピーしました"
    fi
    
    if [ -f "data/attendance.json" ]; then
        cp "data/attendance.json" "$backup_path/"
        log_success "attendance.jsonをコピーしました"
    fi
    
    log_info "テスト用バックアップディレクトリの内容:"
    ls -la "$backup_path"
    
    # テスト用バックアップディレクトリを削除
    rm -rf "$backup_path"
    log_info "テスト用バックアップディレクトリを削除しました"
else
    log_error "テスト用バックアップディレクトリの作成に失敗しました"
fi

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="
log_info "デバッグ結果を確認してください"

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIは正常に応答しています"
    log_info "バックエンドのログを確認して、ディレクトリ作成エラーの詳細を調べてください"
else
    log_error "バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="
