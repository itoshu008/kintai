#!/usr/bin/env bash
set -euo pipefail

DOMAIN="zatint1991.com"
ALT_DOMAIN="www.zatint1991.com"
WEBROOT="/home/zatint1991-hvt55/${DOMAIN}/public"
SITE_AVAIL="/etc/nginx/sites-available/${DOMAIN}"
SITE_ENABL="/etc/nginx/sites-enabled/${DOMAIN}"
FULLCHAIN="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
PRIVKEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

echo "[1/6] 前提確認"
if [[ ! -f "$FULLCHAIN" || ! -f "$PRIVKEY" ]]; then
  echo "❌ 証明書が見つかりません：$FULLCHAIN / $PRIVKEY"
  echo "  先に certbot で発行してください。例:"
  echo "  sudo certbot certonly --webroot -w $WEBROOT -d $DOMAIN -d $ALT_DOMAIN -m itoshu@zat.co.jp --agree-tos --no-eff-email -n"
  exit 1
fi
sudo mkdir -p "$WEBROOT"
echo "ok" | sudo tee "$WEBROOT/index.html" >/dev/null
sudo chown -R "$(stat -c %U $WEBROOT/..):$(stat -c %G $WEBROOT/..)" "$WEBROOT/.." || true

echo "[2/6] 既存設定のバックアップ"
if [[ -f "$SITE_AVAIL" ]]; then
  sudo cp -a "$SITE_AVAIL" "${SITE_AVAIL}.bak.$(date +%F-%H%M%S)"
fi

echo "[3/6] 新しいサイト設定を書き出し（ssl_ciphersは未定義で衝突回避）"
sudo tee "$SITE_AVAIL" >/dev/null <<NGINX
# 80 -> https（統一）
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN} ${ALT_DOMAIN};
  return 301 https://${DOMAIN}\$request_uri;
}

# https 本体（最小安全構成）
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ${DOMAIN} ${ALT_DOMAIN};

  # Ploiのssl.confは使わず、衝突を避ける
  # include /etc/nginx/ssl/ploi/${DOMAIN}/ssl.conf;

  ssl_certificate     ${FULLCHAIN};
  ssl_certificate_key ${PRIVKEY};

  # 明示的な ciphers は一旦未指定（デフォルトで十分 & 衝突回避）
  # ssl_ciphers ...;

  root ${WEBROOT};
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  # API リバースプロキシ
  location ^~ /api/ {
    proxy_pass         http://127.0.0.1:4001/;
    proxy_http_version 1.1;
    proxy_set_header   Host              \$host;
    proxy_set_header   X-Real-IP         \$remote_addr;
    proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto \$scheme;
    proxy_buffering    off;
  }
}
NGINX

echo "[4/6] sites-enabled に有効化"
if [[ ! -e "$SITE_ENABL" ]]; then
  sudo ln -s "$SITE_AVAIL" "$SITE_ENABL"
fi

echo "[5/6] Nginx 構文チェック＆リロード"
sudo nginx -t
sudo systemctl reload nginx

echo "[6/6] 443 待受と疎通チェック"
ss -lntp | grep ':443' || { echo "❌ 443がLISTENしていません"; exit 1; }
echo
echo "== curl test =="
set +e
curl -I --max-time 5 https://${DOMAIN}/ | sed -n '1,10p'
curl -I --max-time 5 https://${ALT_DOMAIN}/ | sed -n '1,10p'
set -e
echo
echo "✅ 完了：ブラウザで https://${DOMAIN} を確認してください。"
