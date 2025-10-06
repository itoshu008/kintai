#!/bin/bash
set -e

# カラー出力用の関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${PURPLE}🚀 $1${NC}"; }
log_debug() { echo -e "${CYAN}🔍 $1${NC}"; }

# エラー処理関数
handle_error() {
    log_error "デプロイ中にエラーが発生しました: $1"
    log_warning "ロールバックを実行します..."
    rollback_deployment
    exit 1
}

# ロールバック関数
rollback_deployment() {
    log_step "ロールバック処理を開始..."
    
    if [ ! -z "$BACKUP_PUBLIC_DIR" ] && [ -d "$BACKUP_PUBLIC_DIR" ]; then
        log_info "前回のpublicディレクトリを復元: $BACKUP_PUBLIC_DIR"
        rm -rf public 2>/dev/null || true
        cp -r "$BACKUP_PUBLIC_DIR" public 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKUP_BACKEND_DIR" ] && [ -d "$BACKUP_BACKEND_DIR" ]; then
        log_info "前回のバックエンドを復元: $BACKUP_BACKEND_DIR"
        pm2 stop attendance-app 2>/dev/null || true
        pm2 delete attendance-app 2>/dev/null || true
        pm2 start "$BACKUP_BACKEND_DIR/index.js" --name "attendance-app" --env production \
          --env PORT=8000 \
          --env NODE_ENV=production \
          --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
          --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
          --env LOG_LEVEL=info \
          --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com" 2>/dev/null || true
    fi
    
    log_warning "ロールバック完了"
}

# システム情報表示
show_system_info() {
    log_step "システム情報を取得中..."
    echo -e "${CYAN}🖥️  サーバー: $(hostname)${NC}"
    echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
    echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
    echo -e "${CYAN}💾 ディスク使用量: $(df -h . | tail -1 | awk '{print $5}')${NC}"
    echo -e "${CYAN}🧠 メモリ使用量: $(free -h | grep Mem | awk '{print $3 "/" $2}')${NC}"
    echo -e "${CYAN}📅 現在時刻: $(date)${NC}"
    echo ""
}

# 前処理チェック
pre_deployment_check() {
    log_step "デプロイ前チェックを実行中..."
    
    # 必要なコマンドの存在確認
    local required_commands=("git" "npm" "node" "pm2")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            handle_error "必要なコマンドが見つかりません: $cmd"
        fi
    done
    log_success "必要なコマンドの確認完了"
    
    # ディスク容量チェック
    local available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 1000000 ]; then
        log_warning "ディスク容量が不足しています (${available_space}KB)"
    fi
    
    # メモリチェック
    local available_memory=$(free | grep Mem | awk '{print $7}')
    if [ "$available_memory" -lt 100000 ]; then
        log_warning "メモリが不足しています (${available_memory}KB)"
    fi
    
    log_success "デプロイ前チェック完了"
}

# バックアップ作成
create_backup() {
    log_step "バックアップを作成中..."
    
    # 現在のpublicディレクトリをバックアップ
    if [ -d "public" ]; then
        BACKUP_PUBLIC_DIR="public-backup-$(date +%s)"
        cp -r public "$BACKUP_PUBLIC_DIR"
        log_success "publicディレクトリをバックアップ: $BACKUP_PUBLIC_DIR"
    fi
    
    # 現在のバックエンドディレクトリをバックアップ
    if [ -d "backend/dist" ]; then
        BACKUP_BACKEND_DIR="backend/dist-backup-$(date +%s)"
        cp -r backend/dist "$BACKUP_BACKEND_DIR"
        log_success "バックエンドディレクトリをバックアップ: $BACKUP_BACKEND_DIR"
    fi
    
    # データディレクトリをバックアップ
    if [ -d "data" ]; then
        BACKUP_DATA_DIR="data-backup-$(date +%s)"
        cp -r data "$BACKUP_DATA_DIR"
        log_success "データディレクトリをバックアップ: $BACKUP_DATA_DIR"
    fi
}

# 権限修正（強化版）
fix_permissions() {
    log_step "権限を修正中..."
    
    # 現在のディレクトリの権限を修正
    chmod -R 755 . 2>/dev/null || log_warning "権限修正で一部エラーが発生しました"
    
    # データディレクトリの権限を特別に修正
    if [ -d "data" ]; then
        chmod -R 644 data/*.json 2>/dev/null || true
        chmod 755 data 2>/dev/null || true
    fi
    
    # node_modulesの権限を修正
    if [ -d "frontend/node_modules" ]; then
        chmod -R 755 frontend/node_modules 2>/dev/null || true
    fi
    if [ -d "backend/node_modules" ]; then
        chmod -R 755 backend/node_modules 2>/dev/null || true
    fi
    
    log_success "権限修正完了"
}

# メイン処理開始
echo -e "${PURPLE}🚀 ULTIMATE POWER DEPLOY (TERSER FIXED) Starting...${NC}"
echo -e "${PURPLE}================================================${NC}"

show_system_info
pre_deployment_check
create_backup
fix_permissions

# 1. 最新コード取得
log_step "最新コードを取得中..."
if ! git pull origin main; then
    handle_error "Git pull に失敗しました"
fi
log_success "Git pull 完了"

# 2. フロントエンドビルド
log_step "フロントエンドをビルド中..."
cd frontend

# node_modulesを完全に削除してクリーンインストール
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール（Terserを含む）
log_info "フロントエンド依存関係をインストール中..."
if ! npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true; then
    log_warning "npm installで一部エラーが発生しましたが、続行します"
fi

# Terserを明示的にインストール
log_info "Terserをインストール中..."
npm install terser --save-dev --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

# 権限を再修正
chmod -R 755 node_modules 2>/dev/null || true

# 新しいビルドディレクトリを使用
BUILD_DIR="dist-ultimate-$(date +%s)"
log_info "新しいビルドディレクトリ: $BUILD_DIR"

# Vite設定を動的生成（Terserエラー対応版）
cat > vite.config.ultimate.ts << EOF
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    proxy: {
      "/api/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: '$BUILD_DIR',
    sourcemap: true,
    emptyOutDir: true,
    minify: 'esbuild', // Terserの代わりにesbuildを使用
    rollupOptions: {
      output: {
        entryFileNames: \`assets/[name]-[hash]-ultimate.js\`,
        chunkFileNames: \`assets/[name]-[hash]-ultimate.js\`,
        assetFileNames: \`assets/[name]-[hash]-ultimate.[ext]\`
      }
    }
  },
});
EOF

# ビルド実行
log_info "フロントエンドをビルド中..."
if ! npx vite build --config vite.config.ultimate.ts; then
    handle_error "フロントエンドビルドに失敗しました"
fi

# 一時設定を削除
rm vite.config.ultimate.ts

# ビルド結果確認
if [ ! -f "$BUILD_DIR/index.html" ]; then
    handle_error "フロントエンドビルド結果が不正です: index.html が見つかりません"
fi

log_success "フロントエンドビルド完了: $BUILD_DIR"
cd ..

# 3. バックエンドビルド
log_step "バックエンドをビルド中..."
cd backend

# node_modulesを完全に削除してクリーンインストール
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係インストール（エラーを無視して続行）
log_info "バックエンド依存関係をインストール中..."
if ! npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true; then
    log_warning "npm installで一部エラーが発生しましたが、続行します"
fi

# 権限を再修正
chmod -R 755 node_modules 2>/dev/null || true

# 新しいビルドディレクトリを使用
BACKEND_BUILD_DIR="dist-ultimate-$(date +%s)"
log_info "新しいバックエンドビルドディレクトリ: $BACKEND_BUILD_DIR"

# TypeScript設定を動的生成
cat > tsconfig.ultimate.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "outDir": "$BACKEND_BUILD_DIR",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"],
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "dist-*"]
}
EOF

# ビルド実行
log_info "バックエンドをビルド中..."
if ! npx tsc -p tsconfig.ultimate.json; then
    handle_error "バックエンドビルドに失敗しました"
fi

# 一時設定を削除
rm tsconfig.ultimate.json

# ビルド結果確認
if [ ! -f "$BACKEND_BUILD_DIR/index.js" ]; then
    handle_error "バックエンドビルド結果が不正です: index.js が見つかりません"
fi

log_success "バックエンドビルド完了: $BACKEND_BUILD_DIR"
cd ..

# 4. 新しいpublicディレクトリへコピー
PUBLIC_DIR="public-ultimate-$(date +%s)"
log_step "フロントエンドを新しいpublicディレクトリにコピー中: $PUBLIC_DIR"

if ! mkdir -p "$PUBLIC_DIR"; then
    handle_error "publicディレクトリの作成に失敗しました"
fi

if ! cp -rf "frontend/$BUILD_DIR"/* "$PUBLIC_DIR/"; then
    handle_error "フロントエンドファイルのコピーに失敗しました"
fi

# コピー結果確認
if [ ! -f "$PUBLIC_DIR/index.html" ]; then
    handle_error "フロントエンドコピー結果が不正です: index.html が見つかりません"
fi

log_success "フロントエンドコピー完了: $PUBLIC_DIR"

# 5. PM2プロセス管理
log_step "PM2プロセスを管理中..."

# 既存プロセスを停止
log_info "既存のPM2プロセスを停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "既存プロセスが見つかりません"
pm2 delete attendance-app 2>/dev/null || log_warning "既存プロセスが見つかりません"

# ポート8000を強制解放
log_info "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 新しいプロセスを起動
log_info "新しいPM2プロセスを起動中..."
if ! pm2 start "backend/$BACKEND_BUILD_DIR/index.js" --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/$PUBLIC_DIR" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"; then
    handle_error "PM2プロセスの起動に失敗しました"
fi

# PM2設定を保存
pm2 save
log_success "PM2プロセス管理完了"

# 6. ヘルスチェック
log_step "ヘルスチェックを実行中..."

# PM2ステータス確認
if ! pm2 status | grep -q "online"; then
    handle_error "PM2プロセスが正常に起動していません"
fi

# ポート確認
if ! netstat -tlnp 2>/dev/null | grep -q ":8000"; then
    log_warning "ポート8000が使用されていない可能性があります"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
sleep 3
if pm2 logs attendance-app --lines 5 2>/dev/null | grep -q "error\|Error\|ERROR"; then
    log_warning "アプリケーションログにエラーが検出されました"
fi

log_success "ヘルスチェック完了"

# 7. クリーンアップ
log_step "古いディレクトリをクリーンアップ中..."

# 古いビルドディレクトリを削除
find frontend -maxdepth 1 -name "dist-*" -type d ! -name "$BUILD_DIR" -exec rm -rf {} \; 2>/dev/null || true
find backend -maxdepth 1 -name "dist-*" -type d ! -name "$BACKEND_BUILD_DIR" -exec rm -rf {} \; 2>/dev/null || true
find . -maxdepth 1 -name "public-*" -type d ! -name "$PUBLIC_DIR" -exec rm -rf {} \; 2>/dev/null || true

# 古いバックアップを削除（7日以上古いもの）
find . -maxdepth 1 -name "*-backup-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

log_success "クリーンアップ完了"

# 8. 最終レポート
echo ""
echo -e "${GREEN}🎉 ULTIMATE POWER DEPLOY (TERSER FIXED) 完了！${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 新しいディレクトリ:${NC}"
echo -e "${CYAN}   Frontend: frontend/$BUILD_DIR${NC}"
echo -e "${CYAN}   Backend: backend/$BACKEND_BUILD_DIR${NC}"
echo -e "${CYAN}   Public: $PUBLIC_DIR${NC}"
echo ""
echo -e "${CYAN}🔍 検証手順:${NC}"
echo -e "${CYAN}1. ブラウザキャッシュをクリア (Ctrl+Shift+R)${NC}"
echo -e "${CYAN}2. https://zatint1991.com/admin-dashboard-2024 を確認${NC}"
echo -e "${CYAN}3. https://zatint1991.com/personal を確認${NC}"
echo -e "${CYAN}4. ログイン機能をテスト${NC}"
echo ""
echo -e "${CYAN}📅 デプロイ完了時刻: $(date)${NC}"
echo -e "${CYAN}⏱️  実行時間: $SECONDS 秒${NC}"
echo ""

# 成功通知
log_success "ULTIMATE POWER DEPLOY (TERSER FIXED) が正常に完了しました！"

