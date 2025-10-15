#!/bin/bash
# アセットパスの動作確認スクリプト

set -euo pipefail

echo "🔍 アセットパスの動作確認を開始します..."

PUB="/home/zatint1991-hvt55/zatint1991.com/public/admin-dashboard-2024"
cd "$PUB"

echo "📁 ディレクトリ確認: $PUB"
ls -la index.html || { echo "❌ index.html が見つかりません"; exit 1; }

echo ""
echo "🔍 index.html 内のJSパスを抽出中..."
REL=$(sed -n 's|.*src="\([^"]*assets/[^"]*\.js\)".*|\1|p' index.html | head -n1)
[ -z "$REL" ] && { echo "❌ メインJSが見つかりません"; exit 1; }

echo "📄 抽出されたJSパス: $REL"

# 相対なら /kintai/ を前置
case "$REL" in
  /kintai/*) ASSET="$REL" ;;
  assets/*)  ASSET="/kintai/$REL" ;;
  */assets/*) ASSET="/$REL" ;;  # 念のため
  *) ASSET="/kintai/$REL" ;;
esac

echo "🎯 最終アセットパス: $ASSET"

echo ""
echo "🌐 アセットのHTTPステータス確認中..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://zatint1991.com$ASSET")
echo "HTTPステータス: $STATUS"

if [ "$STATUS" = "200" ]; then
    echo "✅ アセットパスは正常に動作しています！"
    echo "🎉 白ページ問題は解決されるはずです"
else
    echo "❌ アセットパスに問題があります"
    echo "🔍 詳細確認:"
    curl -I "https://zatint1991.com$ASSET"
fi

echo ""
echo "📋 確認用コマンド:"
echo "curl -s https://zatint1991.com/kintai/ | sed -n '1,60p'"
echo "nginx -T | grep -A 5 -B 5 kintai"
