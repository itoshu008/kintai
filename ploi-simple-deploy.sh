#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Plio Simple Deployment (No node_modules operations)..."
echo "📅 $(date)"
echo ""

# Define deployment directories
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
DATA_DIR="$APP_DIR/data"
PUBLIC_HTML_DIR="$APP_DIR/public"

# Ensure the application directory exists
echo "📍 Current directory: $(pwd)"
if [ ! -d "$APP_DIR" ]; then
  echo "❌ Application directory $APP_DIR not found. Please ensure the repository is cloned there."
  exit 1
fi

cd "$APP_DIR"

# Fetch the latest code from Git
echo "📥 Fetching latest code from Git..."
git pull origin main
echo "✅ Git pull successful"
echo ""

# --- Frontend Deployment ---
echo "🌐 Deploying Frontend..."
cd "$FRONTEND_DIR"

echo "🧹 Cleaning up old frontend build artifacts..."
rm -rf dist .vite-temp tsconfig.tsbuildinfo 2>/dev/null || true

echo "📦 Verifying frontend dependencies..."
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found, installing dependencies..."
  npm install --prefer-offline
fi

echo "🏗️ Building frontend for production..."
if npm run build; then
  echo "✅ Frontend build successful"
else
  echo "❌ Frontend build failed"
  exit 1
fi

# Copy frontend build to the public directory expected by Nginx
echo "📋 Copying frontend build to Nginx public directory: $PUBLIC_HTML_DIR"
mkdir -p "$PUBLIC_HTML_DIR"
rm -rf "$PUBLIC_HTML_DIR/"* 2>/dev/null || true
cp -r dist/* "$PUBLIC_HTML_DIR/"
echo "✅ Frontend deployment complete"
echo ""

# --- Backend Deployment ---
echo "⚙️ Deploying Backend..."
cd "$BACKEND_DIR"

echo "🧹 Cleaning up old backend build artifacts..."
rm -rf dist tsconfig.tsbuildinfo 2>/dev/null || true

echo "📦 Verifying backend dependencies..."
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found, installing dependencies..."
  npm install --prefer-offline
fi

echo "🏗️ Building backend for production..."
if npm run build; then
  echo "✅ Backend build successful"
else
  echo "❌ Backend build failed"
  exit 1
fi

# Ensure data directory exists and is writable
echo "📂 Ensuring data directory exists: $DATA_DIR"
mkdir -p "$DATA_DIR"
chmod -R 775 "$DATA_DIR" 2>/dev/null || true
echo "✅ Data directory ready"
echo ""

# Set environment variables for PM2
echo "📝 Environment configuration:"
echo "   PORT: 8000"
echo "   DATA_DIR: $DATA_DIR"
echo "   FRONTEND_PATH: $PUBLIC_HTML_DIR"
echo ""

# Restart PM2 process
echo "🔄 Restarting backend application with PM2..."
cd "$APP_DIR/backend"

# Stop existing process if running
pm2 stop attendance-app 2>/dev/null || echo "No existing process to stop"

# Start or restart PM2 process
if pm2 start dist/index.js --name "attendance-app" --env production --watch --ignore-watch="data/*" \
  --update-env \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="$DATA_DIR" \
  --env FRONTEND_PATH="$PUBLIC_HTML_DIR" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com,http://zatint1991.com,http://www.zatint1991.com"; then
  echo "✅ PM2 process started successfully"
  pm2 save
else
  echo "⚠️  PM2 start failed, trying restart..."
  pm2 restart attendance-app
fi

echo "✅ Backend deployment complete"
echo ""

# Health check
echo "🏥 Performing health check..."
sleep 3
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "✅ Health check passed - Application is running"
else
  echo "⚠️  Health check failed - Checking logs..."
  pm2 logs attendance-app --lines 20 --nostream
fi
echo ""

# Final status
echo "📊 PM2 Status:"
pm2 status
echo ""

echo "🎉 Simple deployment finished successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   https://zatint1991.com/"
echo "   https://zatint1991.com/admin-dashboard-2024"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    pm2 logs attendance-app"
echo "   Check status: pm2 status"
echo "   Restart:      pm2 restart attendance-app"
echo "   Stop:         pm2 stop attendance-app"