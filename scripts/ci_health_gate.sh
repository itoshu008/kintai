#!/bin/bash
# CI 側ゲート用スクリプト（LISTEN + HEALTH 3連続）

set -Eeuo pipefail

echo "🔍 CI Health Gate Check"
echo "======================"

# LISTEN
echo "Checking port 8001 listening..."
ss -H -ltn "( sport = :8001 )" | grep -q . || { echo "❌ Port 8001 not listening"; exit 2; }
echo "✅ Port 8001 is listening"

# HEALTH（3連続）
echo "Checking health endpoint (3 consecutive)..."
ok=1
for i in 1 2 3; do 
  echo "Health check attempt $i/3..."
  curl -fsS http://127.0.0.1:8001/api/admin/health | grep -q '"ok":true' || { 
    echo "❌ Health check $i failed"; 
    ok=0; 
    break; 
  }
  echo "✅ Health check $i passed"
  sleep 1
done

if [ $ok -eq 1 ]; then
  echo "✅ All health checks passed - Backend is ready!"
  exit 0
else
  echo "❌ Health gate failed"
  exit 3
fi
