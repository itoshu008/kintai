#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PUBLIC_BASE="$APP_DIR/public"
PUBLIC_DIR="$PUBLIC_BASE/kintai"
RELEASES_DIR="$PUBLIC_BASE/releases"
RELEASE_ID="$(date +%Y%m%d-%H%M%S)"
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"

BUILD_USER="itoshu"
PM2_APP="kintai-api"
HOST="127.0.0.1"
PORT="8001"
BRANCH="main"

echo "👤 perms"
sudo chown -R "$BUILD_USER:$BUILD_USER" "$APP_DIR" "/home/$BUILD_USER/.npm" "/home/$BUILD_USER/.pm2" || true
find "$APP_DIR" -type d -exec chmod 775 {} \; ; find "$APP_DIR" -type f -exec chmod 664 {} \;

echo "🌿 git sync ($BRANCH)"
cd "$APP_DIR"
if [ -d .git ]; then
  git fetch --all -p
  git reset --hard "origin/$BRANCH"
else
  echo "⚠️ .git がありません。サーバ側でgit運用をしない場合は手動rsync方式に切り替えてください。"
fi

echo "🧱 backend install/build"
cd "$BACKEND_DIR"
if [ -f package-lock.json ]; then
  if ! npm ci --no-fund --no-audit; then
    echo "⚠️ npm ci lock mismatch → npm install にフォールバック"
    npm install --no-fund --no-audit
  fi
else
  npm install --no-fund --no-audit
fi
npm run build

echo "🚀 PM2 restart"
pm2 delete "$PM2_APP" 2>/dev/null || true
HOST="$HOST" PORT="$PORT" NODE_ENV=production pm2 start "$BACKEND_DIR/dist/server.js" --name "$PM2_APP" --update-env
pm2 save

echo "🩺 health check (up to 60s)"
ok=""
for i in $(seq 1 30); do
  if curl -fsS "http://$HOST:$PORT/api/admin/health" >/dev/null; then
    echo "✅ backend healthy"
    ok="yes"; break
  fi
  echo "  waiting... ($i/30)"
  sleep 2
  [ $((i%5)) -eq 0 ] && pm2 status "$PM2_APP" || true
done
[ -z "$ok" ] && { echo "❌ backend health NG"; exit 1; }

echo "🎨 frontend install/build"
cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  if ! npm ci --no-fund --no-audit; then
    echo "⚠️ npm ci lock mismatch → npm install にフォールバック"
    npm install --no-fund --no-audit
  fi
else
  npm install --no-fund --no-audit
fi
npm run build

echo "🚚 release publish"
mkdir -p "$RELEASES_DIR" "$PUBLIC_DIR"
rsync -az --delete "dist/" "$RELEASES_DIR/$RELEASE_ID/"

# symlink atomic switch
ln -sfn "$RELEASES_DIR/$RELEASE_ID" "$PUBLIC_DIR"

echo "🌀 nginx reload"
sudo nginx -t && sudo systemctl reload nginx

echo "🧹 keep last 5 releases"
ls -1dt "$RELEASES_DIR"/* 2>/dev/null | tail -n +6 | xargs -r rm -rf

echo "🔎 verify"
curl -I "https://zatint1991.com/kintai/" | sed -n '1,6p'
curl -fsS "http://$HOST:$PORT/api/admin/health" && echo "✅ RELEASE $RELEASE_ID deployed"
