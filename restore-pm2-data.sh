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
echo -e "${PURPLE}🚀 PM2 DATA RESTORE Starting...${NC}"
echo -e "${PURPLE}===============================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"

# 2. PM2の状態確認
log_step "PM2の状態を確認中..."
pm2 status

# 3. 既存のPM2プロセスをクリーンアップ
log_step "既存のPM2プロセスをクリーンアップ中..."
pm2 stop all 2>/dev/null || log_warning "停止するプロセスがありませんでした"
pm2 delete all 2>/dev/null || log_warning "削除するプロセスがありませんでした"
pm2 kill 2>/dev/null || log_warning "PM2プロセスがありませんでした"

# 4. バックエンドファイルの確認
log_step "バックエンドファイルを確認中..."
if [ -f "backend/dist/index.js" ]; then
    log_success "バックエンドファイルが存在します"
    ls -la backend/dist/index.js
else
    log_error "バックエンドファイルが見つかりません"
    
    # バックエンドを再ビルド
    log_info "バックエンドを再ビルド中..."
    cd backend
    npm run build
    cd ..
    log_success "バックエンド再ビルド完了"
fi

# 5. データディレクトリの確認と復旧
log_step "データディレクトリを確認中..."
if [ -d "data" ]; then
    log_success "データディレクトリが存在します"
    ls -la data/
    
    # データファイルの存在確認
    if [ -f "data/employees.json" ] && [ -f "data/departments.json" ] && [ -f "data/attendance.json" ]; then
        log_success "データファイルが存在します"
    else
        log_warning "データファイルが不完全です。初期化します..."
        
        # データファイルを初期化
        echo '[]' > data/employees.json
        echo '[]' > data/departments.json
        echo '{}' > data/attendance.json
        echo '[]' > data/holidays.json
        echo '{}' > data/personal_pages.json
        log_success "データファイルを初期化しました"
    fi
else
    log_warning "データディレクトリが見つかりません。作成します..."
    mkdir -p data
    echo '[]' > data/employees.json
    echo '[]' > data/departments.json
    echo '{}' > data/attendance.json
    echo '[]' > data/holidays.json
    echo '{}' > data/personal_pages.json
    log_success "データディレクトリとファイルを作成しました"
fi

# 権限を修正
chmod -R 755 data/
chmod 644 data/*.json 2>/dev/null || true
log_success "データディレクトリの権限を修正しました"

# 6. フロントエンドファイルの確認
log_step "フロントエンドファイルを確認中..."
if [ -d "public" ] && [ -f "public/index.html" ]; then
    log_success "フロントエンドファイルが存在します"
    ls -la public/index.html
else
    log_warning "フロントエンドファイルが見つかりません。再ビルドします..."
    
    # フロントエンドを再ビルド
    cd frontend
    npm install
    npm run build
    cd ..
    
    # publicディレクトリにコピー
    mkdir -p public
    cp -r frontend/dist/* public/
    log_success "フロントエンド再ビルドとコピー完了"
fi

# 7. ポート8000を強制解放
log_step "ポート8000を強制解放中..."
sudo fuser -k 8000/tcp 2>/dev/null || log_warning "ポート8000にプロセスが見つかりません"

# 8. PM2プロセスを再作成
log_step "PM2プロセスを再作成中..."

# 新しいPM2プロセスを起動
log_info "新しいPM2プロセスを起動中..."
pm2 start backend/dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# PM2設定を保存
pm2 save
log_success "PM2プロセス再作成完了"

# 9. ヘルスチェック
log_step "ヘルスチェックを実行中..."
sleep 5

# PM2ステータス確認
if pm2 status | grep -q "online"; then
    log_success "PM2プロセスが正常に起動しています"
else
    log_error "PM2プロセスが正常に起動していません"
    log_info "PM2ログを確認中..."
    pm2 logs attendance-app --lines 10
fi

# ポート確認
if netstat -tlnp 2>/dev/null | grep -q ":8000"; then
    log_success "ポート8000が正常に使用されています"
else
    log_warning "ポート8000が使用されていません"
fi

# 10. データの初期化（必要に応じて）
log_step "データの初期化を実行中..."

# 今日の日付を取得
TODAY=$(date +%Y-%m-%d)
log_info "今日の日付: $TODAY"

# 勤怠データの自動初期化
log_info "勤怠データを自動初期化中..."
cd backend
node -e "
const fs = require('fs');
const path = require('path');

const dataDir = '/home/zatint1991-hvt55/zatint1991.com/data';
const employeesFile = path.join(dataDir, 'employees.json');
const attendanceFile = path.join(dataDir, 'attendance.json');

try {
  // 社員データを読み込み
  const employees = JSON.parse(fs.readFileSync(employeesFile, 'utf8'));
  const attendanceData = JSON.parse(fs.readFileSync(attendanceFile, 'utf8'));
  
  let initializedCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  // 各社員の勤怠データを初期化
  employees.forEach(emp => {
    // 今日の勤怠データ
    const todayKey = \`\${today}-\${emp.code}\`;
    if (!attendanceData[todayKey]) {
      attendanceData[todayKey] = {
        clock_in: null,
        clock_out: null,
        late: 0,
        early: 0,
        overtime: 0,
        night: 0,
        work_minutes: 0
      };
      initializedCount++;
    }
    
    // 明日の勤怠データ
    const tomorrowKey = \`\${tomorrow}-\${emp.code}\`;
    if (!attendanceData[tomorrowKey]) {
      attendanceData[tomorrowKey] = {
        clock_in: null,
        clock_out: null,
        late: 0,
        early: 0,
        overtime: 0,
        night: 0,
        work_minutes: 0
      };
      initializedCount++;
    }
  });
  
  // データを保存
  fs.writeFileSync(attendanceFile, JSON.stringify(attendanceData, null, 2));
  console.log(\`✅ 勤怠データ初期化完了: \${initializedCount}件のデータを作成しました\`);
} catch (error) {
  console.error('❌ 勤怠データ初期化エラー:', error.message);
}
"
cd ..

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 PM2 DATA RESTORE 完了！${NC}"
echo -e "${GREEN}===============================${NC}"
echo -e "${CYAN}🌐 URL: https://zatint1991.com${NC}"
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}📁 データディレクトリ:${NC}"
ls -la data/
echo ""
echo -e "${CYAN}📅 復旧完了時刻: $(date)${NC}"
echo ""

# 成功通知
log_success "PM2 DATA RESTORE が完了しました！"
log_info "システムが正常に動作することを確認してください。"
