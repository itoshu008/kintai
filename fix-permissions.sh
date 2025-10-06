#!/bin/bash

echo "🔧 Fixing permissions for Plio deployment..."

# Define application directory
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"

# Fix ownership
echo "📝 Fixing ownership..."
sudo chown -R zatint1991-hvt55:zatint1991-hvt55 "$APP_DIR"

# Fix permissions
echo "📝 Fixing permissions..."
chmod -R 755 "$APP_DIR"

# Remove problematic node_modules
echo "🧹 Removing problematic node_modules..."
sudo rm -rf "$APP_DIR/node_modules" 2>/dev/null || true
sudo rm -rf "$APP_DIR/frontend/node_modules" 2>/dev/null || true
sudo rm -rf "$APP_DIR/backend/node_modules" 2>/dev/null || true

# Re-fix permissions after cleanup
echo "📝 Re-fixing permissions after cleanup..."
chmod -R 755 "$APP_DIR"

echo "✅ Permissions fixed successfully!"
echo ""
echo "Now you can run: ./ploi-final-deploy.sh"

