#!/bin/bash
# 全デバッグスクリプトを順次実行

set -Eeuo pipefail

echo "🔍 デバッグスクリプト実行開始"
echo "============================="

# 1) 直接実行で赤いエラーを出す
echo ""
echo "1) 直接実行で赤いエラーを出す（PM2を介さず）"
echo "============================================="
bash scripts/debug_direct_run.sh

echo ""
echo "2) PM2側の実引数・環境・ログパスをJSONで吸い上げ"
echo "==============================================="
bash scripts/debug_pm2_status.sh

echo ""
echo "3) 一時的に fork モード＋ログファイル強制で再起動"
echo "==============================================="
bash scripts/debug_fork_mode.sh

echo ""
echo "4) サーバコード側に保険ログを追加"
echo "==============================="
bash scripts/debug_emergency_patch.sh

echo ""
echo "✅ 全デバッグスクリプト実行完了"
echo "============================="
