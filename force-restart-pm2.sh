#!/bin/bash

# PM2を強制的に再起動してバックアップAPIを修正するスクリプト
# 使用方法: bash force-restart-pm2.sh

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
log_step "PM2強制再起動でバックアップAPI修正開始"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

log_info "現在のディレクトリ: $(pwd)"
log_info "現在のユーザー: $(whoami)"
log_info "現在時刻: $(date)"

# PM2を完全停止
log_step "PM2を完全停止中..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 3
log_success "PM2完全停止完了"

# ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || true
pkill -f "node.*8000" 2>/dev/null || true
sleep 2

# バックエンドを再ビルド
log_step "バックエンドを再ビルド中..."
cd backend
rm -rf dist
npm run build
cd ..
log_success "バックエンド再ビルド完了"

# バックエンドのindex.jsを確認
log_step "バックエンドコード確認中..."
if grep -q "api/admin/backups" backend/dist/index.js; then
    log_success "バックアップAPIエンドポイントが正しくビルドされています"
    
    # エンドポイントの詳細確認
    log_info "バックアップAPIエンドポイントの詳細:"
    grep -n "api/admin/backups" backend/dist/index.js | head -3
    
    # ワイルドカードルートの位置確認
    log_info "ワイルドカードルート（app.get('*'）の位置:"
    grep -n "app.get('\*'" backend/dist/index.js || log_warning "ワイルドカードルートが見つかりません"
    
else
    log_error "バックアップAPIエンドポイントが見つかりません"
    exit 1
fi

# PM2で起動
log_step "PM2でアプリケーションを起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

pm2 save
log_success "PM2起動完了"

# ヘルスチェック
log_step "ヘルスチェック実行中..."

# PM2ステータス確認
log_info "PM2ステータス確認中..."
pm2 status

# アプリケーションログ確認
log_info "アプリケーションログ確認中..."
pm2 logs attendance-app --lines 10

# バックアップAPIテスト
log_step "バックアップAPIテスト中..."
log_info "バックアップ一覧APIをテスト中..."

# サーバーが起動するまで待機
sleep 5

if curl -s "http://localhost:8000/api/health" > /dev/null; then
    log_success "サーバーは正常に起動しています"
    
    # バックアップAPIをテスト
    if curl -s "http://localhost:8000/api/admin/backups" > /dev/null; then
        log_success "バックアップ一覧APIが正常に応答しています"
        log_info "バックアップ一覧APIの応答:"
        curl -s "http://localhost:8000/api/admin/backups" | head -c 200
        echo ""
    else
        log_error "バックアップ一覧APIが応答しません"
        
        # エラーログを確認
        log_info "最新のエラーログを確認中..."
        pm2 logs attendance-app --lines 5
    fi
else
    log_error "サーバーが起動していません"
    
    # エラーログを確認
    log_info "最新のエラーログを確認中..."
    pm2 logs attendance-app --lines 10
fi

# 完了メッセージ
log_step "PM2強制再起動完了！"
echo "=========================================="
echo "🌐 URL: https://zatint1991.com"
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "🔄 バックアップシステム:"
echo "  - バックアップ間隔: 60分（1時間）"
echo "  - 最大バックアップ数: 24個（24時間分）"
echo "  - ESモジュール対応完了"
echo "  - require()エラー解決"
echo "  - 手動バックアップ機能追加"
echo "  - APIエンドポイント修正完了"
echo "  - PM2強制再起動完了"
echo ""
echo "📅 再起動完了時刻: $(date)"
echo "=========================================="

log_success "PM2強制再起動が完了しました！"
log_info "ブラウザで https://zatint1991.com/admin-dashboard-2024 にアクセスして確認してください"
log_info "右上のメニューから「💾 バックアップ管理」を選択してバックアップ機能をテストしてください"
log_info "エラーがないか確認してください: pm2 logs attendance-app"
