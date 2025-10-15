#!/usr/bin/env bash
# ESM 相対 import の .js 拡張子を機械的に補正

set -Eeuo pipefail

BACKEND_DIR="backend"

echo "🔧 Fixing ESM imports with .js extensions"
echo "========================================"

# よくある相対importを .js 付きへ（追加でgrep出力を見て必要分を追補）
sed -i "s#'\(\.\./utils/dataStore\)'#'\1.js'#g" $BACKEND_DIR/src/routes/adminMaster.ts 2>/dev/null || true
sed -i "s#'\(\.\./utils/dataStore\)'#'\1.js'#g" $BACKEND_DIR/src/routes/employees.ts 2>/dev/null || true
sed -i "s#'\(\./index\)'#'\1.js'#g"             $BACKEND_DIR/src/server.ts 2>/dev/null || true
sed -i "s#'\(\.\./config\)'#'\1.js'#g"         $BACKEND_DIR/src/utils/dataStore.ts 2>/dev/null || true

echo "Checking for remaining extensionless imports..."
# 取りこぼし検査（表示のみ。出たら同様に .js を追加）
grep -RInE "from ['\"][.]{1,2}/[^'\".]+['\"]" $BACKEND_DIR/src || echo "✅ All relative imports have .js extensions"

echo "✅ ESM import fixes completed"
