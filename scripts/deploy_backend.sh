#!/usr/bin/env bash
set -Eeuo pipefail
: "${BACKEND_DIR:?}"; : "${PM2_APP:?}"; : "${PM2_HOME:?}"
cd "$BACKEND_DIR"

# 依存→ビルド→dev prune（lock優先、ズレたら自動fallback）
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm run build
npm prune --omit=dev

# PM2: 設定ファイルからクリーン適用（唯一の真実）
pm2 delete "$PM2_APP" || true
pm2 start "$BACKEND_DIR/pm2.config.cjs" --only "$PM2_APP"
pm2 save

# 非ストリームでログtail（ハング防止）
ERR_LOG=$(pm2 info "$PM2_APP" | awk -F': ' '/error log path/ {print $2}')
OUT_LOG=$(pm2 info "$PM2_APP" | awk -F': ' '/out log path/ {print $2}')
[ -f "$ERR_LOG" ] && tail -n 120 "$ERR_LOG" || true
[ -f "$OUT_LOG" ] && tail -n 80  "$OUT_LOG" || true

# LISTEN（IPv4/IPv6両対応）→ HEALTH（3連続OK）
ss -H -ltn "( sport = :8001 )" | grep -q . || { echo 'listen NG :8001'; exit 2; }
ok=1; for i in 1 2 3; do curl -fsS http://127.0.0.1:8001/api/admin/health | grep -q '"ok":true' || { ok=0; break; }; sleep 1; done
[ $ok -eq 1 ] || { echo 'health NG'; exit 3; }
echo "✅ backend up & health OK"
