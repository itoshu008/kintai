#!/bin/bash

# バックアップAPIエンドポイントのデバッグスクリプト
# 使用方法: bash debug-backup-api.sh

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
log_step "バックアップAPIエンドポイントデバッグ開始"

# 作業ディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com || exit 1

log_info "現在のディレクトリ: $(pwd)"
log_info "現在のユーザー: $(whoami)"
log_info "現在時刻: $(date)"

# バックエンドのindex.jsを確認
log_step "バックエンドコード確認中..."

if [ -f "backend/dist/index.js" ]; then
    log_info "バックエンドのindex.jsファイルサイズ: $(ls -lh backend/dist/index.js | awk '{print $5}')"
    
    # バックアップAPIエンドポイントの存在確認
    if grep -q "api/admin/backups" backend/dist/index.js; then
        log_success "バックアップAPIエンドポイントが存在します"
        
        # エンドポイントの詳細確認
        log_info "バックアップAPIエンドポイントの詳細:"
        grep -n "api/admin/backups" backend/dist/index.js | head -5
        
        # ワイルドカードルートの位置確認
        log_info "ワイルドカードルート（app.get('*'）の位置:"
        grep -n "app.get('\*'" backend/dist/index.js || log_warning "ワイルドカードルートが見つかりません"
        
    else
        log_error "バックアップAPIエンドポイントが見つかりません"
    fi
    
    # バックアップ関連の関数の存在確認
    log_info "バックアップ関連の関数確認:"
    if grep -q "getBackupList" backend/dist/index.js; then
        log_success "getBackupList関数が存在します"
    else
        log_error "getBackupList関数が見つかりません"
    fi
    
    if grep -q "restoreBackup" backend/dist/index.js; then
        log_success "restoreBackup関数が存在します"
    else
        log_error "restoreBackup関数が見つかりません"
    fi
    
else
    log_error "バックエンドのindex.jsファイルが見つかりません"
fi

# ソースコードの確認
log_step "ソースコード確認中..."

if [ -f "backend/src/index.ts" ]; then
    log_info "ソースコードのバックアップAPIエンドポイント確認:"
    if grep -q "api/admin/backups" backend/src/index.ts; then
        log_success "ソースコードにバックアップAPIエンドポイントが存在します"
        
        # エンドポイントの行番号を表示
        log_info "バックアップAPIエンドポイントの行番号:"
        grep -n "api/admin/backups" backend/src/index.ts
        
        # ワイルドカードルートの位置確認
        log_info "ワイルドカードルート（app.get('*'）の行番号:"
        grep -n "app.get('\*'" backend/src/index.ts || log_warning "ワイルドカードルートが見つかりません"
        
    else
        log_error "ソースコードにバックアップAPIエンドポイントが見つかりません"
    fi
else
    log_error "ソースコードファイルが見つかりません"
fi

# PM2プロセスの確認
log_step "PM2プロセス確認中..."
pm2 status

# アプリケーションログの確認
log_info "最新のアプリケーションログ:"
pm2 logs attendance-app --lines 20

# バックアップAPIの直接テスト
log_step "バックアップAPI直接テスト中..."

# サーバーが起動しているか確認
if curl -s "http://localhost:8000/api/health" > /dev/null; then
    log_success "サーバーは正常に起動しています"
    
    # バックアップAPIをテスト
    log_info "バックアップ一覧APIをテスト中..."
    if curl -s "http://localhost:8000/api/admin/backups" > /dev/null; then
        log_success "バックアップ一覧APIが正常に応答しています"
        curl -s "http://localhost:8000/api/admin/backups" | head -c 200
        echo ""
    else
        log_error "バックアップ一覧APIが応答しません"
    fi
else
    log_error "サーバーが起動していません"
fi

# 完了メッセージ
log_step "デバッグ完了！"
echo "=========================================="
log_info "デバッグ結果を確認してください"
log_info "問題がある場合は、バックエンドを再ビルドしてください:"
echo "  cd backend && npm run build"
log_info "その後、PM2を再起動してください:"
echo "  pm2 restart attendance-app"
echo "=========================================="
