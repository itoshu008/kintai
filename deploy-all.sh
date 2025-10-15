#!/usr/bin/env bash
# 単一スクリプトで: コード反映→Backendビルド/PM2起動→Frontendビルド/配信→Nginx設定/再読込→総合検証
# 実行例:  ssh -p 22 itoshu@sv137.xbiz.ne.jp "bash -s" < deploy-all.sh

set -Eeuo pipefail
trap 's=$?; echo "❌ ERROR (exit $s) at line $LINENO"; echo "Last command: $BASH_COMMAND"; exit $s' ERR

# ====== ここだけ環境に合わせて必要なら変更 ======
BUILD_USER="${BUILD_USER:-itoshu}"
SSH_PORT="${SSH_PORT:-22}"                 # ローカルでssh実行時用（このスクリプト自体はVPS上で実行される想定）
DOMAIN="${DOMAIN:-zatint1991.com}"
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PUBLIC_DIR="$APP_DIR/public/admin-dashboard-2024"
PM2_HOME="/home/$BUILD_USER/.pm2"
PM2_APP="kintai-api"
PORT="${PORT:-8001}"
HOST_BIND="${HOST_BIND:-0.0.0.0}"

NGINX_SITE="/etc/nginx/sites-enabled/$DOMAIN"   # サイト設定ファイル
VITE_BASE="/kintai/"

say(){ printf "\n\033[1;36m[%s]\033[0m %s\n" "$(date '+%F %T')" "$*"; }

# ====== 前提ディレクトリ ======
say "Ensure directories"
mkdir -p "$APP_DIR" "$BACKEND_DIR" "$FRONTEND_DIR" "$PUBLIC_DIR"

# ====== Backend: server.ts（単独起動型, index非依存）を保証 ======
say "Ensure backend server.ts (standalone)"
mkdir -p "$BACKEND_DIR/src/routes/admin"
if [[ ! -f "$BACKEND_DIR/src/routes/admin/index.ts" ]]; then
  cat > "$BACKEND_DIR/src/routes/admin/index.ts" <<'TS'
import { Router } from 'express';
export const admin = Router();

admin.get('/master', (req, res) => {
  const date = String(req.query.date ?? '');
  res.json({ ok: true, date, data: { departments: [], employees: [] } });
});

admin.get('/employees', (_req, res) => {
  res.json([{ id: 1, code: 'E001', name: '田中' }]);
});

export default admin;
TS
fi

# server.ts は壊れやすいので毎回バックアップ→正規内容で上書き
if [[ -f "$BACKEND_DIR/src/server.ts" ]]; then cp "$BACKEND_DIR/src/server.ts" "$BACKEND_DIR/src/server.ts.bak.$(date +%s)" || true; fi
cat > "$BACKEND_DIR/src/server.ts" <<'TS'
import 'dotenv/config';
import express from 'express';
import admin from './routes/admin/index.js';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/admin/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV ?? 'dev', now: new Date().toISOString() });
});

app.use('/api/admin', admin);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
  }
  return next();
});
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[API ERROR]', err);
  res.status(err?.status || 500).json({ ok: false, error: String(err?.message ?? err) });
});

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  if (typeof process.send === 'function') process.send('ready'); // pm2 wait_ready
});
TS

# ====== PM2設定: dist/server.js + wait_ready を保証 ======
say "Ensure pm2.config.cjs"
if [[ -f "$BACKEND_DIR/pm2.config.cjs" ]]; then cp "$BACKEND_DIR/pm2.config.cjs" "$BACKEND_DIR/pm2.config.cjs.bak.$(date +%s)" || true; fi
cat > "$BACKEND_DIR/pm2.config.cjs" <<CJS
module.exports = {
  apps: [{
    name: 'kintai-api',
    script: 'dist/server.js',
    cwd: '$BACKEND_DIR',
    exec_mode: 'cluster',
    instances: 1,
    time: true,
    env: { NODE_ENV: 'production', PORT: '$PORT', HOST: '$HOST_BIND' },

    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    min_uptime: 3000,
    exp_backoff_restart_delay: 1000,
    max_restarts: 20,

    out_file: '/home/$BUILD_USER/.pm2/logs/kintai-api-out.log',
    error_file: '/home/$BUILD_USER/.pm2/logs/kintai-api-error.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false
  }]
}
CJS

# ====== Backend: ビルド（npm ci→build→prune, フォールバックあり）======
say "Backend build (ci→build→prune)"
cd "$BACKEND_DIR"
npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund
npm run build
npm prune --omit=dev

# ====== PM2 起動（delete→start from config） & ゲート ======
say "PM2 start from config"
export PM2_HOME="$PM2_HOME"
pm2 delete "$PM2_APP" || true
pm2 start "$BACKEND_DIR/pm2.config.cjs" --only "$PM2_APP"
pm2 save

say "Gate: LISTEN sport(IPv4/6)"
ok=0
for j in {1..5}; do
  if ss -H -ltn "( sport = :$PORT )" | grep -q .; then ok=1; break; fi
  sleep 1
done
if [[ $ok -ne 1 ]]; then
  echo "❌ listen NG :$PORT"
  tail -n 120 "$PM2_HOME/logs/$PM2_APP-error.log" || true
  exit 2
fi

say "Gate: HEALTH x3"
ok=0; streak=0
for i in {1..10}; do
  if curl -fsS --max-time 10 "http://127.0.0.1:$PORT/api/admin/health" | grep -q '"ok":true'; then
    streak=$((streak+1)); echo "health OK ($streak/3)"
    [[ $streak -ge 3 ]] && { ok=1; break; }
  else
    streak=0; echo "health NG (reset)"
  fi
  sleep 1
done
[[ $ok -eq 1 ]] || { echo "❌ health NG"; tail -n 120 "$PM2_HOME/logs/$PM2_APP-error.log" || true; exit 3; }

# ====== Frontend: Vite base を /kintai/ に固定してビルド公開 ======
say "Frontend build & publish (/kintai/)"
cd "$FRONTEND_DIR"
# vite.config.ts に base を追記/更新
if [[ -f vite.config.ts ]]; then
  if ! grep -q "base: '$VITE_BASE'" vite.config.ts; then
    perl -0777 -pe "s/defineConfig\(\{/\$&\n  base: '$VITE_BASE',/;" -i vite.config.ts || true
    # 失敗時は上書き方式
    grep -q "base: '$VITE_BASE'" vite.config.ts || cat > vite.config.ts <<VITE
import { defineConfig } from 'vite';
export default defineConfig({ base: '$VITE_BASE' });
VITE
  fi
else
  cat > vite.config.ts <<VITE
import { defineConfig } from 'vite';
export default defineConfig({ base: '$VITE_BASE' });
VITE
fi

npm ci --no-audit --no-fund || npm i
npm run build
rsync -az --delete "$FRONTEND_DIR/dist/" "$PUBLIC_DIR/"
chown -R "$BUILD_USER:$BUILD_USER" "$PUBLIC_DIR"

# ====== Nginx: /kintai と /api を正しく設定（server{}内）、test→reload ======
say "Nginx configure /kintai and /api (no global directives in site file)"
sudo cp "$NGINX_SITE" "$NGINX_SITE.bak.$(date +%s)" || true

# user/worker_processes が混入していたら削除
sudo sed -i '/^user\s\+/d;/^worker_processes\s\+/d' "$NGINX_SITE"

# /kintai/ と /api/ の location を差し替え/追記（簡易：存在すれば置換、無ければ追加）
sudo awk -v pub="$PUBLIC_DIR" '
/server\s*\{/ { inserver=1 }
inserver && /location\s+\/kintai\// { ink=1 }
inserver && /location\s+\/api\//    { ina=1 }
{ print }
END{
  if(!ink){
    print "    location /kintai/ {";
    print "        alias " pub "/;";
    print "        try_files $uri $uri/ /kintai/index.html;";
    print "        expires 1h;";
    print "        add_header Cache-Control \"public, max-age=3600\";";
    print "    }";
  }
  if(!ina){
    print "    location /api/ {";
    print "        proxy_set_header Host $host;";
    print "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;";
    print "        proxy_set_header X-Forwarded-Proto $scheme;";
    print "        proxy_read_timeout 60s;";
    print "        proxy_connect_timeout 5s;";
    print "        proxy_pass http://127.0.0.1:'"$PORT"' ;";
    print "    }";
  }
}' "$NGINX_SITE" | sudo tee "$NGINX_SITE" >/dev/null

sudo nginx -t
sudo systemctl reload nginx

# ====== 終了前の総合確認 ======
say "Final verify (direct & nginx)"
echo "-- direct --"
curl -fsS "http://127.0.0.1:$PORT/api/admin/health" && echo
curl -fsS "http://127.0.0.1:$PORT/api/admin/master?date=$(date +%F)" && echo
curl -fsS "http://127.0.0.1:$PORT/api/admin/employees" && echo
echo "-- nginx --"
curl -I "https://$DOMAIN/kintai/" | sed -n '1,8p' || true
curl -fsS "https://$DOMAIN/api/admin/health" && echo
curl -fsS "https://$DOMAIN/api/admin/master?date=$(date +%F)" && echo
curl -fsS "https://$DOMAIN/api/admin/employees" && echo

say "✅ ALL DONE"
