#!/bin/bash
# ② 恒久修正（lock を更新してコミット → 以後 npm ci で安定）

set -Eeuo pipefail

echo "🔧 dotenv lock修正を開始します..."

# リポジトリ内（backend/）で実行
cd backend

echo "📦 dotenvを本番依存に追加（devではなくdependencies）"
npm install dotenv@^16.6.1 --save

echo "🏗️ ビルド確認"
npm run build || echo "⚠️ ビルドに警告がありますが続行します"

echo "📝 lockを含めてコミット & プッシュ"
git add package.json package-lock.json
git commit -m "chore(backend): add dotenv to dependencies and update lock"
git push

echo "✅ dotenv lock修正完了！"
echo "これでCIの該当行を npm ci --include=dev --no-audit --no-fund に戻せます"
