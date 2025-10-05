#!/bin/bash

# Plio Safe Deployment Script - Avoids node_modules permission issues
# This script works with existing node_modules instead of removing them

set -e

echo "🚀 Starting Plio Safe Deployment (No node_modules removal)..."
echo "📍 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📥 Fetching latest code from Git..."
git pull origin main

echo "🧹 Cleaning up build artifacts (safe cleanup)..."
# Only remove build artifacts, not node_modules
rm -f tsconfig.tsbuildinfo
rm -rf dist
rm -rf frontend/dist

echo "📦 Installing dependencies (preserving existing node_modules)..."
# Use npm install without removing node_modules
npm install --prefer-offline --no-audit

echo "🔨 Building backend..."
npm run build

echo "🌐 Building frontend..."
cd frontend
npm install --prefer-offline --no-audit
npm run build
cd ..

echo "📁 Setting up data directory..."
mkdir -p data

echo "🔧 Setting environment variables..."
export NODE_ENV=production
export PORT=8000
export CORS_ORIGIN=https://zatint1991.com
export DATA_DIR=/home/zatint1991-hvt55/attendance-deploy/data
export FRONTEND_PATH=/home/zatint1991-hvt55/zatint1991.com/public
export LOG_LEVEL=warn

echo "🔄 Restarting PM2 process..."
pm2 stop attendance-app 2>/dev/null || true
pm2 delete attendance-app 2>/dev/null || true
pm2 start dist/index.js --name "attendance-app" --env production

echo "⏳ Waiting for application to start..."
sleep 5

echo "🔍 Health check..."
if curl -f http://localhost:8000/api/health >/dev/null 2>&1; then
    echo "✅ Backend is running successfully!"
else
    echo "❌ Backend health check failed. Checking PM2 status..."
    pm2 status
    pm2 logs attendance-app --lines 20
fi

echo "🎉 Deployment completed!"
echo "📊 PM2 Status:"
pm2 status

echo "🌐 Application should be accessible at:"
echo "   - https://zatint1991.com/"
echo "   - https://zatint1991.com/admin-dashboard-2024"
