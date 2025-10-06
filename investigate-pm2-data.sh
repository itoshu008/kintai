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
echo -e "${PURPLE}🔍 PM2 DATA INVESTIGATION Starting...${NC}"
echo -e "${PURPLE}====================================${NC}"

# 1. 現在の状態確認
log_step "現在の状態を確認中..."
echo -e "${CYAN}📁 作業ディレクトリ: $(pwd)${NC}"
echo -e "${CYAN}👤 ユーザー: $(whoami)${NC}"
echo -e "${CYAN}🏠 ホームディレクトリ: $HOME${NC}"

# 2. PM2プロセス情報の詳細確認
log_step "PM2プロセス情報を詳細確認中..."
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status

echo -e "${CYAN}📋 PM2 Process List:${NC}"
pm2 list

echo -e "${CYAN}🔧 PM2 Process Details:${NC}"
pm2 show attendance-app 2>/dev/null || log_warning "attendance-appプロセスが見つかりません"

# 3. PM2の設定ファイル確認
log_step "PM2の設定ファイルを確認中..."
echo -e "${CYAN}📁 PM2設定ディレクトリ:${NC}"
ls -la ~/.pm2/ 2>/dev/null || log_warning "~/.pm2/ディレクトリが見つかりません"

echo -e "${CYAN}📄 PM2設定ファイル:${NC}"
if [ -f ~/.pm2/ecosystem.config.js ]; then
    cat ~/.pm2/ecosystem.config.js
else
    log_warning "ecosystem.config.jsが見つかりません"
fi

if [ -f ~/.pm2/dump.pm2 ]; then
    echo -e "${CYAN}📄 PM2 Dump File:${NC}"
    cat ~/.pm2/dump.pm2
else
    log_warning "dump.pm2が見つかりません"
fi

# 4. 環境変数の確認
log_step "環境変数を確認中..."
echo -e "${CYAN}🌍 現在の環境変数:${NC}"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "DATA_DIR: $DATA_DIR"
echo "FRONTEND_PATH: $FRONTEND_PATH"
echo "LOG_LEVEL: $LOG_LEVEL"
echo "CORS_ORIGIN: $CORS_ORIGIN"

# 5. データディレクトリの確認
log_step "データディレクトリを確認中..."
echo -e "${CYAN}📁 現在のディレクトリのdata:${NC}"
if [ -d "data" ]; then
    ls -la data/
    echo -e "${CYAN}📄 データファイルの内容:${NC}"
    for file in data/*.json; do
        if [ -f "$file" ]; then
            echo -e "${CYAN}📄 $(basename "$file"):${NC}"
            head -5 "$file"
            echo "..."
        fi
    done
else
    log_warning "現在のディレクトリにdataディレクトリがありません"
fi

# 6. 他の可能性のあるデータディレクトリを検索
log_step "他の可能性のあるデータディレクトリを検索中..."
echo -e "${CYAN}🔍 データディレクトリの検索結果:${NC}"

# ホームディレクトリ内でdataディレクトリを検索
find ~ -name "data" -type d 2>/dev/null | head -10

# 現在のディレクトリ内でdataディレクトリを検索
find . -name "data" -type d 2>/dev/null

# 7. バックエンドの設定確認
log_step "バックエンドの設定を確認中..."
if [ -f "backend/dist/index.js" ]; then
    echo -e "${CYAN}📄 バックエンドファイルの存在確認:${NC}"
    ls -la backend/dist/index.js
    
    echo -e "${CYAN}🔍 バックエンドファイル内のDATA_DIR設定:${NC}"
    grep -n "DATA_DIR" backend/dist/index.js || log_warning "DATA_DIRが見つかりません"
    
    echo -e "${CYAN}🔍 バックエンドファイル内のFRONTEND_PATH設定:${NC}"
    grep -n "FRONTEND_PATH" backend/dist/index.js || log_warning "FRONTEND_PATHが見つかりません"
else
    log_warning "バックエンドファイルが見つかりません"
fi

# 8. プロセスが実際に使用しているデータディレクトリを確認
log_step "プロセスが実際に使用しているデータディレクトリを確認中..."
if pm2 list | grep -q "attendance-app"; then
    echo -e "${CYAN}🔍 プロセスの環境変数:${NC}"
    pm2 env attendance-app 2>/dev/null || log_warning "プロセスの環境変数を取得できませんでした"
    
    echo -e "${CYAN}🔍 プロセスの作業ディレクトリ:${NC}"
    pm2 show attendance-app | grep -E "(cwd|exec path)" || log_warning "プロセスの作業ディレクトリを取得できませんでした"
else
    log_warning "attendance-appプロセスが実行されていません"
fi

# 9. ログファイルの確認
log_step "ログファイルを確認中..."
echo -e "${CYAN}📄 PM2ログ:${NC}"
pm2 logs attendance-app --lines 20 2>/dev/null || log_warning "PM2ログを取得できませんでした"

# 10. ファイルシステムの使用状況確認
log_step "ファイルシステムの使用状況を確認中..."
echo -e "${CYAN}💾 ディスク使用量:${NC}"
df -h

echo -e "${CYAN}📁 現在のディレクトリの内容:${NC}"
ls -la

# 11. 最終レポート
echo ""
echo -e "${GREEN}🎉 PM2 DATA INVESTIGATION 完了！${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "${CYAN}📅 調査完了時刻: $(date)${NC}"
echo ""

# 推奨アクション
log_step "推奨アクション:"
echo -e "${CYAN}1. PM2プロセスを再起動: pm2 restart attendance-app${NC}"
echo -e "${CYAN}2. データディレクトリを確認: ls -la data/${NC}"
echo -e "${CYAN}3. 環境変数を確認: pm2 env attendance-app${NC}"
echo -e "${CYAN}4. ログを確認: pm2 logs attendance-app${NC}"
echo ""

log_success "PM2 DATA INVESTIGATION が完了しました！"
