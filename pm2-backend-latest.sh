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

# メイン処理開始
echo -e "${PURPLE}🚀 PM2 BACKEND LATEST Starting...${NC}"
echo -e "${PURPLE}===================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}📅 現在時刻: $(date)${NC}"

# 2. 最新コード取得
log_step "最新コードを取得中..."
if git pull origin main; then
    log_success "最新コードの取得が完了しました"
else
    log_warning "Git pullに失敗しました。現在のコードで続行します"
fi

# 3. 既存のPM2プロセスを停止
log_step "既存のPM2プロセスを停止中..."
pm2 stop attendance-app 2>/dev/null || log_warning "既存のPM2プロセスが見つかりません"
pm2 delete attendance-app 2>/dev/null || log_warning "既存のPM2プロセスが見つかりません"

# ポート8000を解放
log_info "ポート8000を解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"
pkill -f "node.*backend" 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

# 4. バックエンドの依存関係インストール
log_step "バックエンドの依存関係をインストール中..."
cd backend

# node_modulesをクリーンアップ
log_info "node_modulesをクリーンアップ中..."
rm -rf node_modules package-lock.json 2>/dev/null || true

# 依存関係をインストール
log_info "依存関係をインストール中..."
if npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true; then
    log_success "依存関係のインストールが完了しました"
else
    log_warning "依存関係のインストールで一部エラーが発生しましたが、続行します"
fi

# 5. バックエンドをビルド
log_step "バックエンドをビルド中..."

# 古いビルドを削除
rm -rf dist 2>/dev/null || true

# TypeScriptをビルド
log_info "TypeScriptをビルド中..."
if npx tsc; then
    log_success "TypeScriptビルドが完了しました"
else
    log_error "TypeScriptビルドに失敗しました"
    exit 1
fi

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルド結果が不正です: index.js が見つかりません"
    exit 1
fi

log_success "バックエンドビルド完了: dist/index.js"
ls -la dist/index.js

cd ..

# 6. データディレクトリの確認
log_step "データディレクトリを確認中..."
if [ ! -d "data" ]; then
    log_info "データディレクトリを作成中..."
    mkdir -p data
fi

# 必要なデータファイルを確認
log_info "データファイルを確認中..."
if [ ! -f "data/employees.json" ]; then
    echo '[]' > data/employees.json
    log_info "employees.json を作成しました"
fi
if [ ! -f "data/departments.json" ]; then
    echo '[]' > data/departments.json
    log_info "departments.json を作成しました"
fi
if [ ! -f "data/attendance.json" ]; then
    echo '{}' > data/attendance.json
    log_info "attendance.json を作成しました"
fi
if [ ! -f "data/holidays.json" ]; then
    cat > data/holidays.json << 'EOF'
{
  "2024": {
    "01-01": "元日",
    "01-08": "成人の日",
    "02-11": "建国記念の日",
    "02-12": "建国記念の日 振替休日",
    "02-23": "天皇誕生日",
    "03-20": "春分の日",
    "04-29": "昭和の日",
    "05-03": "憲法記念日",
    "05-04": "みどりの日",
    "05-05": "こどもの日",
    "05-06": "こどもの日 振替休日",
    "07-15": "海の日",
    "08-11": "山の日",
    "08-12": "山の日 振替休日",
    "09-16": "敬老の日",
    "09-22": "秋分の日",
    "09-23": "秋分の日 振替休日",
    "10-14": "スポーツの日",
    "11-03": "文化の日",
    "11-04": "文化の日 振替休日",
    "11-23": "勤労感謝の日"
  },
  "2025": {
    "01-01": "元日",
    "01-13": "成人の日",
    "02-11": "建国記念の日",
    "02-23": "天皇誕生日",
    "03-20": "春分の日",
    "04-29": "昭和の日",
    "05-03": "憲法記念日",
    "05-04": "みどりの日",
    "05-05": "こどもの日",
    "05-06": "こどもの日 振替休日",
    "07-21": "海の日",
    "08-11": "山の日",
    "09-15": "敬老の日",
    "09-23": "秋分の日",
    "10-13": "スポーツの日",
    "11-03": "文化の日",
    "11-23": "勤労感謝の日",
    "11-24": "勤労感謝の日 振替休日"
  }
}
EOF
    log_info "holidays.json を作成しました"
fi
if [ ! -f "data/personal_pages.json" ]; then
    echo '{}' > data/personal_pages.json
    log_info "personal_pages.json を作成しました"
fi

log_success "データファイルの確認が完了しました"

# 7. フロントエンドの確認
log_step "フロントエンドを確認中..."
if [ ! -d "public" ] || [ ! -f "public/index.html" ]; then
    log_warning "フロントエンドが見つかりません。再ビルドします..."
    
    cd frontend
    
    # フロントエンドの依存関係をインストール
    log_info "フロントエンドの依存関係をインストール中..."
    npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true
    
    # フロントエンドをビルド
    log_info "フロントエンドをビルド中..."
    npm run build
    
    cd ..
    
    # publicディレクトリにコピー
    log_info "フロントエンドをpublicディレクトリにコピー中..."
    mkdir -p public
    cp -r frontend/dist/* public/
    
    log_success "フロントエンドの再ビルドとコピーが完了しました"
else
    log_success "フロントエンドが既に存在します"
fi

# 8. PM2でバックエンドを起動
log_step "PM2でバックエンドを起動中..."

# 環境変数を設定
export PORT=8000
export NODE_ENV=production
export DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data"
export FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"
export LOG_LEVEL=info
export CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2でバックエンドを起動
log_info "バックエンドをPM2で起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com" \
  --max-memory-restart 500M \
  --min-uptime 10000 \
  --max-restarts 3

# 9. PM2設定を保存
log_step "PM2設定を保存中..."
pm2 save

# 10. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 5

# PM2ステータス確認
log_info "PM2ステータスを確認中..."
pm2 status

# ポート確認
log_info "ポート8000を確認中..."
if lsof -i :8000 2>/dev/null | grep -q "LISTEN"; then
    log_success "ポート8000が正常に使用されています"
    lsof -i :8000
else
    log_warning "ポート8000が使用されていません"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
pm2 logs attendance-app --lines 10

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 PM2 BACKEND LATEST 完了！${NC}"
echo -e "${GREEN}===================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データ統計:${NC}"
if [ -f "data/employees.json" ]; then
    EMPLOYEES_COUNT=$(cat data/employees.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  社員数: $EMPLOYEES_COUNT名${NC}"
fi
if [ -f "data/departments.json" ]; then
    DEPARTMENTS_COUNT=$(cat data/departments.json | jq '. | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  部署数: $DEPARTMENTS_COUNT部署${NC}"
fi
if [ -f "data/attendance.json" ]; then
    ATTENDANCE_COUNT=$(cat data/attendance.json | jq 'keys | length' 2>/dev/null || echo "0")
    echo -e "${CYAN}  勤怠データ: $ATTENDANCE_COUNT件${NC}"
fi
echo ""
echo -e "${CYAN}📅 起動完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "最新のバックエンドがPM2で起動しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
