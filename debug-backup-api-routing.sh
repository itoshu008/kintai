#!/bin/bash

# バックアップAPIのルーティング問題をデバッグするスクリプト
# 使用方法: bash debug-backup-api-routing.sh

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
log_step "バックアップAPIルーティング問題デバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# 1. バックエンドのindex.jsでバックアップAPIエンドポイントを確認
log_step "バックエンドのindex.jsでバックアップAPIエンドポイントを確認中..."

log_info "バックアップ関連のAPIエンドポイントを検索中..."
grep -n "app\.\(get\|post\|put\|delete\)('/api/admin/backups" backend/dist/index.js

log_info "バックアップAPIエンドポイントの詳細:"
grep -A 5 -B 2 "app\.\(get\|post\|put\|delete\)('/api/admin/backups" backend/dist/index.js

# 2. ワイルドカードルートの位置を確認
log_step "ワイルドカードルートの位置を確認中..."
log_info "app.get('*'の位置:"
grep -n "app\.get('\*'" backend/dist/index.js

log_info "ワイルドカードルートの前後:"
grep -A 10 -B 10 "app\.get('\*'" backend/dist/index.js

# 3. バックアップAPIがワイルドカードルートより前にあるか確認
log_step "バックアップAPIがワイルドカードルートより前にあるか確認中..."
backup_line=$(grep -n "app\.post('/api/admin/backups/create'" backend/dist/index.js | cut -d: -f1)
wildcard_line=$(grep -n "app\.get('\*'" backend/dist/index.js | cut -d: -f1)

if [ -n "$backup_line" ] && [ -n "$wildcard_line" ]; then
    log_info "バックアップAPI作成エンドポイントの行: $backup_line"
    log_info "ワイルドカードルートの行: $wildcard_line"
    
    if [ "$backup_line" -lt "$wildcard_line" ]; then
        log_success "バックアップAPIはワイルドカードルートより前にあります"
    else
        log_error "バックアップAPIはワイルドカードルートより後にあります！"
        log_warning "これが404エラーの原因です"
    fi
else
    log_error "バックアップAPIまたはワイルドカードルートが見つかりません"
fi

# 4. すべてのAPIエンドポイントをリストアップ
log_step "すべてのAPIエンドポイントをリストアップ中..."
log_info "APIエンドポイント一覧:"
grep -n "app\.\(get\|post\|put\|delete\)('/api" backend/dist/index.js | head -20

# 5. PM2プロセスの詳細を確認
log_step "PM2プロセスの詳細を確認中..."
log_info "PM2プロセス一覧:"
pm2 list

log_info "PM2プロセスの詳細:"
pm2 show attendance-app

# 6. バックエンドの起動ログを確認
log_step "バックエンドの起動ログを確認中..."
log_info "最新の起動ログ:"
pm2 logs attendance-app --out --lines 100 | grep -E "(server|listening|port|started|running|backup|API|endpoint)" || log_warning "関連するログが見つかりません"

# 7. バックエンドを再起動してログを監視
log_step "バックエンドを再起動してログを監視中..."

# ログファイルを作成
log_file="/tmp/restart_debug_$(date +%s).log"

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > "$log_file" 2>&1 &
log_pid=$!

# 少し待機
sleep 2

# PM2を再起動
log_info "PM2を再起動中..."
pm2 restart attendance-app

# 再起動後のログを収集
sleep 5

# ログ監視を停止
kill $log_pid 2>/dev/null || true
sleep 1

# ログファイルの内容を確認
log_step "再起動後のログを確認中..."
if [ -f "$log_file" ]; then
    log_info "再起動ログの内容:"
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

# 8. バックアップ作成APIをテスト
log_step "バックアップ作成APIをテスト中..."

# ログファイルを作成
test_log_file="/tmp/api_test_$(date +%s).log"

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > "$test_log_file" 2>&1 &
test_log_pid=$!

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
kill $test_log_pid 2>/dev/null || true
sleep 1

# ログファイルの内容を確認
log_step "APIテスト後のログを確認中..."
if [ -f "$test_log_file" ]; then
    log_info "APIテストログの内容:"
    cat "$test_log_file"
    
    # バックアップ関連のログを抽出
    log_info "バックアップ関連のログ:"
    grep -i "backup\|manual\|mkdir\|copy\|POST.*backups" "$test_log_file" || log_warning "バックアップ関連のログが見つかりません"
    
    # エラーログを抽出
    log_info "エラーログ:"
    grep -i "error\|fail\|exception\|throw" "$test_log_file" || log_info "エラーログは見つかりませんでした"
    
    rm -f "$test_log_file"
else
    log_warning "ログファイルが見つかりません"
fi

# 9. バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la /home/zatint1991-hvt55/zatint1991.com/backups

# 10. バックアップ一覧APIをテスト
log_step "バックアップ一覧APIをテスト中..."
list_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "http://localhost:8000/api/admin/backups")
list_http_status=$(echo "$list_response" | grep "HTTP_STATUS" | cut -d':' -f2)
list_body=$(echo "$list_response" | sed '/HTTP_STATUS/d')

log_info "一覧API HTTPステータスコード: $list_http_status"
log_info "一覧API レスポンスボディ: $list_body"

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="

if [ "$create_http_status" = "200" ]; then
    log_success "バックアップ作成APIは正常に応答しています"
    if [ "$list_http_status" = "200" ]; then
        log_success "バックアップ一覧APIも正常に応答しています"
        log_warning "しかし、バックアップディレクトリが作成されていません"
        log_info "バックエンドのコードに問題がある可能性があります"
    else
        log_error "バックアップ一覧APIがエラーを返しています: $list_http_status"
    fi
else
    log_error "バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="
