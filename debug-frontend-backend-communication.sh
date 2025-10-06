#!/bin/bash

# フロントエンドとバックエンドの通信問題をデバッグするスクリプト
# 使用方法: bash debug-frontend-backend-communication.sh

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
log_step "フロントエンドとバックエンドの通信問題デバッグ開始"

log_info "現在時刻: $(date)"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

# 1. フロントエンドのバックアップ関連コードを確認
log_step "フロントエンドのバックアップ関連コードを確認中..."

log_info "MasterPage.tsxでバックアップ関連のコードを検索中..."
if [ -f "frontend/src/pages/MasterPage.tsx" ]; then
    log_info "MasterPage.tsxのバックアップ関連コード:"
    grep -n -A 10 -B 5 "backup\|Backup" frontend/src/pages/MasterPage.tsx || log_warning "バックアップ関連のコードが見つかりません"
else
    log_error "MasterPage.tsxが見つかりません"
fi

# 2. フロントエンドのビルド結果を確認
log_step "フロントエンドのビルド結果を確認中..."

log_info "フロントエンドのdistディレクトリを確認中..."
if [ -d "frontend/dist" ]; then
    log_success "フロントエンドのdistディレクトリが存在します"
    log_info "distディレクトリの内容:"
    ls -la frontend/dist/
    
    log_info "index.htmlの内容を確認中..."
    if [ -f "frontend/dist/index.html" ]; then
        log_info "index.htmlの内容:"
        cat frontend/dist/index.html
    else
        log_error "index.htmlが見つかりません"
    fi
else
    log_error "フロントエンドのdistディレクトリが存在しません"
fi

# 3. バックエンドのログをクリアして詳細監視
log_step "バックエンドのログをクリアして詳細監視中..."

# ログをクリア
pm2 flush attendance-app

# ログファイルを作成
log_file="/tmp/communication_debug_$(date +%s).log"

# バックエンドのログを監視開始（バックグラウンド）
pm2 logs attendance-app --lines 0 > "$log_file" 2>&1 &
log_pid=$!

# 少し待機
sleep 2

# 4. 直接バックアップ作成APIをテスト
log_step "直接バックアップ作成APIをテスト中..."

log_info "手動バックアップ作成APIを実行中..."
create_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8000/api/admin/backups/create" -H "Content-Type: application/json" -d '{}')
create_http_status=$(echo "$create_response" | grep "HTTP_STATUS" | cut -d':' -f2)
create_body=$(echo "$create_response" | sed '/HTTP_STATUS/d')

log_info "作成API HTTPステータスコード: $create_http_status"
log_info "作成API レスポンスボディ: $create_body"

# 少し待機してログを収集
sleep 3

# 5. バックアップ一覧APIをテスト
log_step "バックアップ一覧APIをテスト中..."

log_info "バックアップ一覧APIを実行中..."
list_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "http://localhost:8000/api/admin/backups")
list_http_status=$(echo "$list_response" | grep "HTTP_STATUS" | cut -d':' -f2)
list_body=$(echo "$list_response" | sed '/HTTP_STATUS/d')

log_info "一覧API HTTPステータスコード: $list_http_status"
log_info "一覧API レスポンスボディ: $list_body"

# 6. フロントエンドからAPIをテスト
log_step "フロントエンドからAPIをテスト中..."

log_info "フロントエンドのURLからAPIをテスト中..."
frontend_create_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://zatint1991.com/api/admin/backups/create" -H "Content-Type: application/json" -d '{}')
frontend_create_http_status=$(echo "$frontend_create_response" | grep "HTTP_STATUS" | cut -d':' -f2)
frontend_create_body=$(echo "$frontend_create_response" | sed '/HTTP_STATUS/d')

log_info "フロントエンド経由作成API HTTPステータスコード: $frontend_create_http_status"
log_info "フロントエンド経由作成API レスポンスボディ: $frontend_create_body"

# 少し待機してログを収集
sleep 3

# ログ監視を停止
kill $log_pid 2>/dev/null || true
sleep 1

# 7. 収集されたログを確認
log_step "収集されたログを確認中..."
if [ -f "$log_file" ]; then
    log_info "ログファイルの内容:"
    cat "$log_file"
    
    # バックアップ関連のログを抽出
    log_info "バックアップ関連のログ:"
    grep -i "backup\|manual\|mkdir\|copy\|POST.*backups\|GET.*backups" "$log_file" || log_warning "バックアップ関連のログが見つかりません"
    
    # エラーログを抽出
    log_info "エラーログ:"
    grep -i "error\|fail\|exception\|throw" "$log_file" || log_info "エラーログは見つかりませんでした"
    
    # API呼び出しログを抽出
    log_info "API呼び出しログ:"
    grep -i "POST\|GET.*api" "$log_file" || log_warning "API呼び出しログが見つかりません"
    
    rm -f "$log_file"
else
    log_warning "ログファイルが見つかりません"
fi

# 8. バックアップディレクトリを再確認
log_step "バックアップディレクトリを再確認中..."
log_info "バックアップディレクトリの内容:"
ls -la /home/zatint1991-hvt55/zatint1991.com/backups

# 9. ネットワーク接続をテスト
log_step "ネットワーク接続をテスト中..."

log_info "localhost:8000への接続をテスト中..."
if curl -s --connect-timeout 5 http://localhost:8000/api/health > /dev/null; then
    log_success "localhost:8000への接続は正常です"
else
    log_error "localhost:8000への接続に失敗しました"
fi

log_info "zatint1991.comへの接続をテスト中..."
if curl -s --connect-timeout 5 https://zatint1991.com/api/health > /dev/null; then
    log_success "zatint1991.comへの接続は正常です"
else
    log_error "zatint1991.comへの接続に失敗しました"
fi

# 10. バックエンドのプロセスを確認
log_step "バックエンドのプロセスを確認中..."

log_info "Node.jsプロセスを確認中..."
ps aux | grep node | grep -v grep || log_warning "Node.jsプロセスが見つかりません"

log_info "ポート8000を使用しているプロセスを確認中..."
netstat -tlnp | grep :8000 || log_warning "ポート8000を使用しているプロセスが見つかりません"

# 11. バックエンドのコードを直接確認
log_step "バックエンドのコードを直接確認中..."

log_info "バックエンドのindex.jsでバックアップ作成処理を確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_info "バックアップ作成APIの実装:"
    grep -A 20 "app.post('/api/admin/backups/create'" backend/dist/index.js || log_error "バックアップ作成APIが見つかりません"
else
    log_error "backend/dist/index.jsが見つかりません"
fi

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="

if [ "$create_http_status" = "200" ]; then
    log_success "直接バックアップ作成APIは正常に応答しています"
    if [ "$list_http_status" = "200" ]; then
        log_success "直接バックアップ一覧APIも正常に応答しています"
        if [ "$frontend_create_http_status" = "200" ]; then
            log_success "フロントエンド経由のバックアップ作成APIも正常に応答しています"
            log_warning "しかし、バックアップディレクトリが作成されていません"
            log_info "バックエンドのコードに問題がある可能性があります"
        else
            log_error "フロントエンド経由のバックアップ作成APIがエラーを返しています: $frontend_create_http_status"
        fi
    else
        log_error "直接バックアップ一覧APIがエラーを返しています: $list_http_status"
    fi
else
    log_error "直接バックアップ作成APIがエラーを返しています: $create_http_status"
    echo "$create_body"
fi

echo "=========================================="

# 一時ファイルを削除
rm -f /tmp/communication_debug_*.log
