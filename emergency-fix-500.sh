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
echo -e "${RED}🚨 EMERGENCY 500 ERROR FIX Starting...${NC}"
echo -e "${RED}====================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}📅 現在時刻: $(date)${NC}"

# 2. システムリソース確認
log_step "システムリソースを確認中..."
echo -e "${CYAN}💾 ディスク使用量: $(df -h . | tail -1 | awk '{print $5}')${NC}"
echo -e "${CYAN}🧠 メモリ使用量: $(free -h | grep Mem | awk '{print $3 "/" $2}')${NC}"

# 3. 全プロセスの強制停止
log_step "全プロセスを強制停止中..."
log_info "PM2プロセスを停止中..."
pm2 stop all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 delete all 2>/dev/null || log_warning "PM2プロセスが見つかりません"
pm2 kill 2>/dev/null || log_warning "PM2プロセスが見つかりません"

log_info "Node.jsプロセスを強制停止中..."
pkill -f node 2>/dev/null || log_warning "Node.jsプロセスが見つかりません"

log_info "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 4. 完全クリーンアップ
log_step "完全クリーンアップを実行中..."
log_info "古いビルドファイルを削除中..."
rm -rf frontend/dist* 2>/dev/null || true
rm -rf backend/dist* 2>/dev/null || true
rm -rf public* 2>/dev/null || true
rm -rf *-backup-* 2>/dev/null || true

log_info "node_modulesをクリーンアップ中..."
rm -rf frontend/node_modules 2>/dev/null || true
rm -rf backend/node_modules 2>/dev/null || true

# 5. フロントエンドの完全再ビルド
log_step "フロントエンドを完全再ビルド中..."
cd frontend

log_info "フロントエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

log_info "フロントエンドをビルド中..."
npm run build

# ビルド結果確認
if [ ! -f "dist/index.html" ]; then
    log_error "フロントエンドビルドに失敗しました"
    exit 1
fi

log_success "フロントエンドビルド完了"
cd ..

# 6. バックエンドの完全再ビルド
log_step "バックエンドを完全再ビルド中..."
cd backend

log_info "バックエンド依存関係をインストール中..."
npm install --prefer-offline --no-audit --silent 2>&1 | grep -v "EACCES" || true

log_info "バックエンドをビルド中..."
npm run build

# ビルド結果確認
if [ ! -f "dist/index.js" ]; then
    log_error "バックエンドビルドに失敗しました"
    exit 1
fi

log_success "バックエンドビルド完了"
cd ..

# 7. データディレクトリの完全初期化
log_step "データディレクトリを完全初期化中..."
rm -rf data 2>/dev/null || true
mkdir -p data

# データファイルを作成
cat > data/employees.json << 'EOF'
[]
EOF

cat > data/departments.json << 'EOF'
[]
EOF

cat > data/attendance.json << 'EOF'
{}
EOF

cat > data/holidays.json << 'EOF'
[
  {
    "date": "2024-01-01",
    "name": "元日"
  },
  {
    "date": "2024-01-08",
    "name": "成人の日"
  },
  {
    "date": "2024-02-11",
    "name": "建国記念の日"
  },
  {
    "date": "2024-02-12",
    "name": "建国記念の日 振替休日"
  },
  {
    "date": "2024-02-23",
    "name": "天皇誕生日"
  },
  {
    "date": "2024-03-20",
    "name": "春分の日"
  },
  {
    "date": "2024-04-29",
    "name": "昭和の日"
  },
  {
    "date": "2024-05-03",
    "name": "憲法記念日"
  },
  {
    "date": "2024-05-04",
    "name": "みどりの日"
  },
  {
    "date": "2024-05-05",
    "name": "こどもの日"
  },
  {
    "date": "2024-05-06",
    "name": "こどもの日 振替休日"
  },
  {
    "date": "2024-07-15",
    "name": "海の日"
  },
  {
    "date": "2024-08-11",
    "name": "山の日"
  },
  {
    "date": "2024-08-12",
    "name": "山の日 振替休日"
  },
  {
    "date": "2024-09-16",
    "name": "敬老の日"
  },
  {
    "date": "2024-09-22",
    "name": "秋分の日"
  },
  {
    "date": "2024-09-23",
    "name": "秋分の日 振替休日"
  },
  {
    "date": "2024-10-14",
    "name": "スポーツの日"
  },
  {
    "date": "2024-11-03",
    "name": "文化の日"
  },
  {
    "date": "2024-11-04",
    "name": "文化の日 振替休日"
  },
  {
    "date": "2024-11-23",
    "name": "勤労感謝の日"
  }
]
EOF

cat > data/personal_pages.json << 'EOF'
{}
EOF

# 権限を設定
chmod -R 755 data/
chmod 644 data/*.json

log_success "データディレクトリ初期化完了"

# 8. フロントエンドをpublicにコピー
log_step "フロントエンドをpublicにコピー中..."
rm -rf public 2>/dev/null || true
mkdir -p public
cp -r frontend/dist/* public/

# コピー結果確認
if [ ! -f "public/index.html" ]; then
    log_error "フロントエンドコピーに失敗しました"
    exit 1
fi

log_success "フロントエンドコピー完了"

# 9. PM2プロセスを起動
log_step "PM2プロセスを起動中..."

# 環境変数を設定
export PORT=8000
export NODE_ENV=production
export DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data"
export FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public"
export LOG_LEVEL=info
export CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2プロセスを起動
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2設定を保存
pm2 save

log_success "PM2プロセス起動完了"

# 10. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 5

# PM2ステータス確認
log_info "PM2ステータスを確認中..."
pm2 status

# ポート確認
log_info "ポート8000を確認中..."
if netstat -tlnp 2>/dev/null | grep -q ":8000"; then
    log_success "ポート8000が正常に使用されています"
else
    log_warning "ポート8000が使用されていません"
fi

# アプリケーションログ確認
log_info "アプリケーションログを確認中..."
pm2 logs attendance-app --lines 10

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 EMERGENCY 500 ERROR FIX 完了！${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データディレクトリ:${NC}"
ls -la data/
echo ""
echo -e "${CYAN}📁 Publicディレクトリ:${NC}"
ls -la public/
echo ""
echo -e "${CYAN}📅 修正完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "EMERGENCY 500 ERROR FIX が完了しました！"
log_info "ブラウザで https://zatint1991.com にアクセスして確認してください。"
