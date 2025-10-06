#!/bin/bash

# バックアップ作成時のログを詳細にデバッグするスクリプト
# 使用方法: bash debug-backup-logs.sh

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
log_step "バックアップ作成ログ詳細デバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# バックエンドのログをクリア
log_step "バックエンドのログをクリア中..."
pm2 flush
log_success "ログクリア完了"

# バックエンドのindex.jsでバックアップ作成処理を確認
log_step "バックエンドコードでバックアップ作成処理を確認中..."
log_info "手動バックアップ作成APIの実装を確認中..."

if grep -A 20 "手動バックアップ作成API" backend/dist/index.js; then
    log_success "手動バックアップ作成APIの実装が見つかりました"
else
    log_warning "手動バックアップ作成APIの実装が見つかりません"
fi

# バックアップ作成処理の詳細を確認
log_info "バックアップ作成処理の詳細を確認中..."
grep -A 30 "app.post('/api/admin/backups/create'" backend/dist/index.js || log_warning "バックアップ作成APIが見つかりません"

# バックアップディレクトリのパスを確認
log_info "バックアップディレクトリのパス設定を確認中..."
grep -n "BACKUP_DIR" backend/dist/index.js

# 実際のパスを計算して確認
log_step "実際のパスを計算して確認中..."
data_dir="/home/zatint1991-hvt55/zatint1991.com/data"
backup_dir="/home/zatint1991-hvt55/zatint1991.com/backups"

log_info "DATA_DIR: $data_dir"
log_info "BACKUP_DIR: $backup_dir"

# ディレクトリの権限を確認
log_info "ディレクトリの権限を確認中..."
ls -ld "$data_dir"
ls -ld "$backup_dir"

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
    grep -i "backup\|manual" "$log_file" || log_warning "バックアップ関連のログが見つかりません"
    
    # エラーログを抽出
    log_info "エラーログ:"
    grep -i "error\|fail\|exception" "$log_file" || log_info "エラーログは見つかりませんでした"
    
    rm -f "$log_file"
else
    log_warning "ログファイルが見つかりません"
fi

# 最新のPM2ログを確認
log_step "最新のPM2ログを確認中..."
log_info "最新の出力ログ:"
pm2 logs attendance-app --out --lines 30

log_info "最新のエラーログ:"
pm2 logs attendance-app --err --lines 30

# バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la backups/ 2>/dev/null || log_warning "バックアップディレクトリが存在しません"

# バックエンドプロセスの詳細を確認
log_step "バックエンドプロセスの詳細を確認中..."
log_info "PM2プロセス情報:"
pm2 show attendance-app

# バックエンドのindex.jsファイルの存在確認
log_step "バックエンドファイルの存在確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドのindex.jsファイルが存在します"
    log_info "ファイルサイズ: $(ls -lh backend/dist/index.js | awk '{print $5}')"
    log_info "最終更新時刻: $(ls -l backend/dist/index.js | awk '{print $6, $7, $8}')"
else
    log_error "バックエンドのindex.jsファイルが存在しません"
fi

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="
log_info "デバッグ結果を確認してください"

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIは正常に応答しています"
    log_warning "しかし、バックアップディレクトリが作成されていません"
    log_info "バックエンドのログを詳細に確認して、ディレクトリ作成処理でエラーが発生していないか調べてください"
else
    log_error "バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="
