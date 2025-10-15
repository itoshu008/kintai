#!/usr/bin/env bash
# ドリフト検知ガード（設定のズレを検出）

set -Eeuo pipefail

echo "🔍 Drift Guard Check"
echo "==================="

# 1) 相対importに .js 無し → 失敗
echo "Checking ESM imports..."
if grep -RInE "from ['\"][.]{1,2}/[^'\".]+['\"]" backend/src; then
  echo "❌ ESM import missing .js extensions"
  exit 20
fi
echo "✅ ESM imports have .js extensions"

# 2) tsconfig の module 系
echo "Checking TypeScript config..."
if ! jq -e '.compilerOptions.module=="NodeNext" and .compilerOptions.moduleResolution=="NodeNext"' backend/tsconfig.json >/dev/null; then
  echo "❌ tsconfig.json module settings incorrect"
  exit 21
fi
echo "✅ TypeScript config is ESM (NodeNext)"

# 3) package.json の type
echo "Checking package.json type..."
if ! jq -e '.type=="module"' backend/package.json >/dev/null; then
  echo "❌ package.json type is not 'module'"
  exit 22
fi
echo "✅ package.json type is 'module'"

# 4) PM2設定ファイルの存在と基本構造
echo "Checking PM2 config..."
if [ ! -f "backend/pm2.config.cjs" ]; then
  echo "❌ PM2 config file missing"
  exit 23
fi

if ! grep -q "wait_ready: true" backend/pm2.config.cjs; then
  echo "❌ PM2 config missing wait_ready setting"
  exit 24
fi
echo "✅ PM2 config has wait_ready setting"

echo "✅ All drift checks passed - Configuration is consistent"
