#!/usr/bin/env bash
# 404修正統合実行スクリプト

set -Eeuo pipefail

echo "🚀 Complete 404 Fix Implementation"
echo "================================="

# 1) 環境変数設定
echo "Step 1: Setting up environment..."
bash scripts/setup_404_fix_env.sh

# 2) ESM import修正
echo "Step 2: Fixing ESM imports..."
bash scripts/fix_esm_imports.sh

# 3) Nginx設定修正
echo "Step 3: Fixing Nginx API proxy..."
bash scripts/fix_nginx_api_proxy.sh

# 4) デプロイ・テスト
echo "Step 4: Deploying and testing..."
bash scripts/deploy_and_test_404_fix.sh

# 5) E2Eテスト
echo "Step 5: Running E2E tests..."
bash scripts/e2e_api_test.sh

# 6) ドリフト検知
echo "Step 6: Running drift guard..."
bash scripts/ci_drift_guard.sh

echo "✅ Complete 404 fix implementation finished!"
echo ""
echo "Next steps:"
echo "1. Check the test results above"
echo "2. If issues remain, check the specific error messages"
echo "3. Run individual scripts for targeted fixes"
