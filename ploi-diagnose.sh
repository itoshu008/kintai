#!/bin/bash

# Plio Diagnosis Script
# デプロイの問題を診断

echo "🔍 Diagnosing deployment issues..."
echo ""

# 1. 現在のGitコミット
echo "📌 Current Git commit:"
git log --oneline -1
echo ""

# 2. Gitステータス
echo "📊 Git status:"
git status --short
echo ""

# 3. リモートとの差分
echo "🔄 Diff with remote:"
git fetch origin
DIFF=$(git diff HEAD origin/main --name-only)
if [ -z "$DIFF" ]; then
    echo "✅ Up to date with origin/main"
else
    echo "⚠️ Differences found:"
    echo "$DIFF"
fi
echo ""

# 4. MasterPage.tsxの特定行を確認
echo "🔎 Checking MasterPage.tsx line 368:"
sed -n '368p' frontend/src/pages/MasterPage.tsx
echo ""

# 5. adminApiのインポートを確認
echo "🔎 Checking adminApi import:"
grep -n "api as adminApi" frontend/src/pages/MasterPage.tsx || echo "❌ adminApi import not found"
echo ""

# 6. TypeScriptキャッシュ確認
echo "📁 TypeScript cache files:"
find . -name "tsconfig.tsbuildinfo" -ls 2>/dev/null || echo "No cache files found"
echo ""

# 7. Node modules
echo "📦 Node modules status:"
if [ -d "node_modules" ]; then
    echo "✅ Root node_modules exists"
else
    echo "❌ Root node_modules missing"
fi
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend node_modules exists"
else
    echo "❌ Frontend node_modules missing"
fi
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend node_modules exists"
else
    echo "❌ Backend node_modules missing"
fi
echo ""

echo "✅ Diagnosis complete"
