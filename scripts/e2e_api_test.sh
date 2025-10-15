#!/usr/bin/env bash
# e2e で "同じURL" を2系統叩いて合格判定

set -Eeuo pipefail

VPS_HOST="zatint1991.com"
PORT=8001

echo "🧪 E2E API Test"
echo "=============="

echo "Test 1: Direct backend access (port $PORT)"
echo "----------------------------------------"
echo "GET /api/admin/departments:"
curl -i -X GET http://127.0.0.1:$PORT/api/admin/departments || echo "❌ Direct GET failed"

echo -e "\nPOST /api/admin/departments:"
curl -i -X POST http://127.0.0.1:$PORT/api/admin/departments \
  -H 'Content-Type: application/json' \
  --data '{"name":"部署テスト"}' || echo "❌ Direct POST failed"

echo -e "\n\nTest 2: Nginx proxy access (production URL)"
echo "--------------------------------------------"
echo "GET /api/admin/departments:"
curl -i -X GET https://$VPS_HOST/api/admin/departments || echo "❌ Nginx GET failed"

echo -e "\nPOST /api/admin/departments:"
curl -i -X POST https://$VPS_HOST/api/admin/departments \
  -H 'Content-Type: application/json' \
  --data '{"name":"部署テスト"}' || echo "❌ Nginx POST failed"

echo -e "\n\nTest 3: 404 test (non-existent endpoint)"
echo "----------------------------------------"
echo "GET /api/admin/nonexistent:"
curl -i -X GET http://127.0.0.1:$PORT/api/admin/nonexistent || echo "❌ 404 test failed"

echo -e "\n✅ E2E API testing completed"
echo ""
echo "Analysis:"
echo "- Direct OK / Nginx NG → Nginx proxy_pass issue"
echo "- Both NG → Route mounting or ESM extension issue"
echo "- Both OK → 404 fix successful!"
