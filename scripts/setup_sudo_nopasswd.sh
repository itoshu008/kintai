#!/bin/bash
# sudo パスワード要求対策の設定スクリプト

set -Eeuo pipefail

echo "🔧 Setting up sudo NOPASSWD for CI operations..."

# /etc/sudoers.d/ci-nginx を作成
sudo tee /etc/sudoers.d/ci-nginx > /dev/null <<'EOF'
# CI operations for nginx management
itoshu ALL=NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl status nginx
EOF

# 権限を正しく設定
sudo chmod 440 /etc/sudoers.d/ci-nginx

# 構文チェック
sudo visudo -c -f /etc/sudoers.d/ci-nginx

echo "✅ sudo NOPASSWD setup completed"
echo "itoshu can now run nginx commands without password"
