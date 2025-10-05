#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Plio Simple Deployment (No node_modules operations)..."

# Define deployment directories
APP_DIR="/home/zatint1991-hvt55/zatint1991.com"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
DATA_DIR="$APP_DIR/data"

# Ensure the application directory exists
echo "📍 Current directory: $(pwd)"
if [ ! -d "$APP_DIR" ]; then
  echo "Application directory $APP_DIR not found. Please ensure the repository is cloned there."
  exit 1
fi

cd "$APP_DIR"

# Fetch the latest code from Git
echo "📥 Fetching latest code from Git..."
git pull origin main

# --- Frontend Deployment ---
echo "🌐 Deploying Frontend..."
cd "$FRONTEND_DIR"

echo "🧹 Cleaning up old frontend build artifacts (NO node_modules touch)..."
rm -rf dist .vite-temp tsconfig.tsbuildinfo

echo "🏗️ Building frontend for production..."
npm run build

# Copy frontend build to the public directory expected by Nginx
echo "📋 Copying frontend build to Nginx public directory..."
PUBLIC_HTML_DIR="/home/zatint1991-hvt55/zatint1991.com/public"
mkdir -p "$PUBLIC_HTML_DIR"
rm -rf "$PUBLIC_HTML_DIR/*" # Clear existing public files
cp -r dist/* "$PUBLIC_HTML_DIR/"

echo "✅ Frontend deployment complete."

# --- Backend Deployment ---
echo "⚙️ Deploying Backend..."
cd "$BACKEND_DIR"

echo "🧹 Cleaning up old backend build artifacts (NO node_modules touch)..."
rm -rf dist tsconfig.tsbuildinfo

echo "🏗️ Building backend for production..."
npm run build

# Ensure data directory exists and is writable
echo "📂 Ensuring data directory exists: $DATA_DIR"
mkdir -p "$DATA_DIR"
chmod -R 775 "$DATA_DIR"

# Restart PM2 process
echo "🔄 Restarting backend application with PM2..."
pm2 restart attendance-app || pm2 start dist/index.js --name "attendance-app" --env production --watch --ignore-watch="data/*"

echo "✅ Backend deployment complete."

echo "🎉 Simple deployment finished successfully!"
echo "🌐 Check your application at: https://zatint1991.com"