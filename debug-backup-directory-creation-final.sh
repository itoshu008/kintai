#!/bin/bash

# バックアップディレクトリ作成の最終デバッグスクリプト
# 使用方法: bash debug-backup-directory-creation-final.sh

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
log_step "バックアップディレクトリ作成の最終デバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# 1. バックエンドのコードを詳細に確認
log_step "バックエンドのコードを詳細に確認中..."

log_info "バックアップ作成APIの完全な実装を確認中..."
grep -A 50 "app.post('/api/admin/backups/create'" backend/dist/index.js

# 2. バックアップディレクトリのパスを確認
log_step "バックアップディレクトリのパスを確認中..."

log_info "BACKUP_DIRの定義:"
grep -n "const BACKUP_DIR" backend/dist/index.js

log_info "DATA_DIRの定義:"
grep -n "const DATA_DIR" backend/dist/index.js

# 実際のパスを計算
data_dir="/home/zatint1991-hvt55/zatint1991.com/data"
backup_dir="/home/zatint1991-hvt55/zatint1991.com/backups"

log_info "DATA_DIR: $data_dir"
log_info "BACKUP_DIR: $backup_dir"

# 3. ディレクトリの権限を詳細確認
log_step "ディレクトリの権限を詳細確認中..."

log_info "DATA_DIRの詳細:"
ls -la "$data_dir"

log_info "BACKUP_DIRの詳細:"
ls -la "$backup_dir"

log_info "親ディレクトリの権限:"
ls -la /home/zatint1991-hvt55/zatint1991.com/

# 4. 手動でバックアップディレクトリ作成をテスト
log_step "手動でバックアップディレクトリ作成をテスト中..."

timestamp=$(date +"%Y-%m-%dT%H-%M-%S")
backup_name="manual_backup_${timestamp}"
backup_path="$backup_dir/$backup_name"

log_info "テスト用バックアップディレクトリを作成中: $backup_path"

# ディレクトリ作成をテスト
if mkdir -p "$backup_path" 2>&1; then
    log_success "テスト用バックアップディレクトリが作成されました"
    
    # 権限を確認
    log_info "作成されたディレクトリの権限:"
    ls -la "$backup_path"
    
    # データファイルをコピーしてテスト
    log_info "データファイルをコピーしてテスト中..."
    if [ -f "$data_dir/employees.json" ]; then
        if cp "$data_dir/employees.json" "$backup_path/" 2>&1; then
            log_success "employees.jsonをコピーしました"
        else
            log_error "employees.jsonのコピーに失敗しました"
        fi
    else
        log_warning "employees.jsonが存在しません"
    fi
    
    if [ -f "$data_dir/departments.json" ]; then
        if cp "$data_dir/departments.json" "$backup_path/" 2>&1; then
            log_success "departments.jsonをコピーしました"
        else
            log_error "departments.jsonのコピーに失敗しました"
        fi
    else
        log_warning "departments.jsonが存在しません"
    fi
    
    if [ -f "$data_dir/attendance.json" ]; then
        if cp "$data_dir/attendance.json" "$backup_path/" 2>&1; then
            log_success "attendance.jsonをコピーしました"
        else
            log_error "attendance.jsonのコピーに失敗しました"
        fi
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

# 5. バックエンドのログをクリアして詳細監視
log_step "バックエンドのログをクリアして詳細監視中..."

# ログをクリア
pm2 flush attendance-app

# ログファイルを作成
log_file="/tmp/backup_final_debug_$(date +%s).log"

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > "$log_file" 2>&1 &
log_pid=$!

# 少し待機
sleep 2

# 6. バックアップ作成APIを実行してログを監視
log_step "バックアップ作成APIを実行してログを監視中..."

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

# 7. 収集されたログを詳細確認
log_step "収集されたログを詳細確認中..."
if [ -f "$log_file" ]; then
    log_info "ログファイルの内容:"
    cat "$log_file"
    
    # バックアップ関連のログを抽出
    log_info "バックアップ関連のログ:"
    grep -i "backup\|manual\|mkdir\|copy\|POST.*backups" "$log_file" || log_warning "バックアップ関連のログが見つかりません"
    
    # エラーログを抽出
    log_info "エラーログ:"
    grep -i "error\|fail\|exception\|throw" "$log_file" || log_info "エラーログは見つかりませんでした"
    
    # ディレクトリ作成関連のログを抽出
    log_info "ディレクトリ作成関連のログ:"
    grep -i "mkdir\|directory\|path\|backup" "$log_file" || log_warning "ディレクトリ作成関連のログが見つかりません"
    
    rm -f "$log_file"
else
    log_warning "ログファイルが見つかりません"
fi

# 8. バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la "$backup_dir"

# 9. バックエンドのコードでエラーハンドリングを確認
log_step "バックエンドのコードでエラーハンドリングを確認中..."

log_info "バックアップ作成APIのエラーハンドリング:"
grep -A 10 -B 5 "catch.*error" backend/dist/index.js | grep -A 15 -B 5 "backup"

# 10. バックエンドのコードでmkdirSyncの使用を確認
log_step "バックエンドのコードでmkdirSyncの使用を確認中..."

log_info "mkdirSyncの使用箇所:"
grep -n "mkdirSync" backend/dist/index.js

log_info "mkdirSyncの前後のコード:"
grep -A 5 -B 5 "mkdirSync" backend/dist/index.js

# 11. バックエンドのコードでcopyFileSyncの使用を確認
log_step "バックエンドのコードでcopyFileSyncの使用を確認中..."

log_info "copyFileSyncの使用箇所:"
grep -n "copyFileSync" backend/dist/index.js

log_info "copyFileSyncの前後のコード:"
grep -A 5 -B 5 "copyFileSync" backend/dist/index.js

# 12. バックエンドのコードでstatSyncの使用を確認
log_step "バックエンドのコードでstatSyncの使用を確認中..."

log_info "statSyncの使用箇所:"
grep -n "statSync" backend/dist/index.js

log_info "statSyncの前後のコード:"
grep -A 5 -B 5 "statSync" backend/dist/index.js

# 13. バックエンドのコードでexistsSyncの使用を確認
log_step "バックエンドのコードでexistsSyncの使用を確認中..."

log_info "existsSyncの使用箇所:"
grep -n "existsSync" backend/dist/index.js

log_info "existsSyncの前後のコード:"
grep -A 5 -B 5 "existsSync" backend/dist/index.js

# 14. バックエンドのコードでpath.joinの使用を確認
log_step "バックエンドのコードでpath.joinの使用を確認中..."

log_info "path.joinの使用箇所:"
grep -n "path.join" backend/dist/index.js

log_info "path.joinの前後のコード:"
grep -A 5 -B 5 "path.join" backend/dist/index.js

# 15. バックエンドのコードでlogger.infoの使用を確認
log_step "バックエンドのコードでlogger.infoの使用を確認中..."

log_info "logger.infoの使用箇所:"
grep -n "logger.info" backend/dist/index.js

log_info "logger.infoの前後のコード:"
grep -A 5 -B 5 "logger.info" backend/dist/index.js

# 完了メッセージ
log_step "最終デバッグ完了！"
echo "=========================================="

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIは正常に応答しています"
    log_warning "しかし、バックアップディレクトリが作成されていません"
    log_info "バックエンドのコードに問題がある可能性があります"
    log_info "上記の詳細なコード分析結果を確認してください"
else
    log_error "バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="

# 一時ファイルを削除
rm -f /tmp/backup_final_debug_*.log
