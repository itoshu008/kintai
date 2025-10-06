#!/bin/bash

# バックアップディレクトリ作成の問題を直接確認するスクリプト
# 使用方法: bash check-backup-directory-creation.sh

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
log_step "バックアップディレクトリ作成問題直接確認開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# バックエンドのindex.jsでバックアップ作成処理を直接確認
log_step "バックエンドのindex.jsでバックアップ作成処理を直接確認中..."

# 手動バックアップ作成APIの実装を抽出
log_info "手動バックアップ作成APIの実装を抽出中..."
grep -A 50 "app.post('/api/admin/backups/create'" backend/dist/index.js > /tmp/backup_create_api.js

if [ -s /tmp/backup_create_api.js ]; then
    log_success "手動バックアップ作成APIの実装を抽出しました"
    log_info "実装内容:"
    cat /tmp/backup_create_api.js
else
    log_error "手動バックアップ作成APIの実装が見つかりません"
fi

# バックアップディレクトリのパスを確認
log_step "バックアップディレクトリのパスを確認中..."
log_info "BACKUP_DIRの定義:"
grep -n "const BACKUP_DIR" backend/dist/index.js

log_info "DATA_DIRの定義:"
grep -n "const DATA_DIR" backend/dist/index.js

# 実際のパスを計算
log_info "実際のパスを計算中..."
data_dir="/home/zatint1991-hvt55/zatint1991.com/data"
backup_dir="/home/zatint1991-hvt55/zatint1991.com/backups"

log_info "DATA_DIR: $data_dir"
log_info "BACKUP_DIR: $backup_dir"

# ディレクトリの存在と権限を確認
log_step "ディレクトリの存在と権限を確認中..."
if [ -d "$data_dir" ]; then
    log_success "DATA_DIRが存在します: $data_dir"
    ls -ld "$data_dir"
else
    log_error "DATA_DIRが存在しません: $data_dir"
fi

if [ -d "$backup_dir" ]; then
    log_success "BACKUP_DIRが存在します: $backup_dir"
    ls -ld "$backup_dir"
else
    log_error "BACKUP_DIRが存在しません: $backup_dir"
fi

# 手動でバックアップディレクトリを作成してテスト
log_step "手動でバックアップディレクトリを作成してテスト中..."
timestamp=$(date +"%Y-%m-%dT%H-%M-%S")
backup_name="manual_backup_${timestamp}"
backup_path="$backup_dir/$backup_name"

log_info "テスト用バックアップディレクトリを作成中: $backup_path"
mkdir -p "$backup_path"
chmod 755 "$backup_path"

if [ -d "$backup_path" ]; then
    log_success "テスト用バックアップディレクトリが作成されました"
    
    # データファイルをコピーしてテスト
    log_info "データファイルをコピーしてテスト中..."
    if [ -f "$data_dir/employees.json" ]; then
        cp "$data_dir/employees.json" "$backup_path/"
        log_success "employees.jsonをコピーしました"
    else
        log_warning "employees.jsonが存在しません"
    fi
    
    if [ -f "$data_dir/departments.json" ]; then
        cp "$data_dir/departments.json" "$backup_path/"
        log_success "departments.jsonをコピーしました"
    else
        log_warning "departments.jsonが存在しません"
    fi
    
    if [ -f "$data_dir/attendance.json" ]; then
        cp "$data_dir/attendance.json" "$backup_path/"
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

# バックエンドのログを詳細に確認
log_step "バックエンドのログを詳細に確認中..."
log_info "最新の出力ログ:"
pm2 logs attendance-app --out --lines 50

log_info "最新のエラーログ:"
pm2 logs attendance-app --err --lines 50

# バックアップ作成APIを実行してログを監視
log_step "バックアップ作成APIを実行してログを監視中..."

# ログファイルを作成
log_file="/tmp/backup_debug_$(date +%s).log"

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > "$log_file" 2>&1 &
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

# 少し待機してログを収集
sleep 3

# ログ監視を停止
kill $log_pid 2>/dev/null || true
sleep 1

# ログファイルの内容を確認
log_step "収集されたログを確認中..."
if [ -f "$log_file" ]; then
    log_info "ログファイルの内容:"
    cat "$log_file"
    
    # バックアップ関連のログを抽出
    log_info "バックアップ関連のログ:"
    grep -i "backup\|manual\|mkdir\|copy" "$log_file" || log_warning "バックアップ関連のログが見つかりません"
    
    # エラーログを抽出
    log_info "エラーログ:"
    grep -i "error\|fail\|exception\|throw" "$log_file" || log_info "エラーログは見つかりませんでした"
    
    rm -f "$log_file"
else
    log_warning "ログファイルが見つかりません"
fi

# バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la "$backup_dir"

# 完了メッセージ
log_step "確認完了！"
echo "=========================================="
log_info "確認結果を確認してください"

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIは正常に応答しています"
    log_warning "しかし、バックアップディレクトリが作成されていません"
    log_info "バックエンドのコードに問題がある可能性があります"
else
    log_error "バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="

# 一時ファイルを削除
rm -f /tmp/backup_create_api.js
