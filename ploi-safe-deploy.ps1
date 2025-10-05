# Plio Safe Deployment Script (PowerShell) - Avoids node_modules permission issues
# This script works with existing node_modules instead of removing them

Write-Host "🚀 Starting Plio Safe Deployment (No node_modules removal)..." -ForegroundColor Green
Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "📥 Fetching latest code from Git..." -ForegroundColor Yellow
git pull origin main

Write-Host "🧹 Cleaning up build artifacts (safe cleanup)..." -ForegroundColor Yellow
# Only remove build artifacts, not node_modules
if (Test-Path "tsconfig.tsbuildinfo") { Remove-Item "tsconfig.tsbuildinfo" -Force }
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
if (Test-Path "frontend/dist") { Remove-Item "frontend/dist" -Recurse -Force }

Write-Host "📦 Installing dependencies (preserving existing node_modules)..." -ForegroundColor Yellow
# Use npm install without removing node_modules
npm install --prefer-offline --no-audit

Write-Host "🔨 Building backend..." -ForegroundColor Yellow
npm run build

Write-Host "🌐 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install --prefer-offline --no-audit
npm run build
Set-Location ..

Write-Host "📁 Setting up data directory..." -ForegroundColor Yellow
if (-not (Test-Path "data")) { New-Item -ItemType Directory -Name "data" }

Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
$env:PORT = "8000"
$env:CORS_ORIGIN = "https://zatint1991.com"
$env:DATA_DIR = "/home/zatint1991-hvt55/attendance-deploy/data"
$env:FRONTEND_PATH = "/home/zatint1991-hvt55/zatint1991.com/public"
$env:LOG_LEVEL = "warn"

Write-Host "🔄 Restarting PM2 process..." -ForegroundColor Yellow
pm2 stop attendance-app 2>$null
pm2 delete attendance-app 2>$null
pm2 start dist/index.js --name "attendance-app" --env production

Write-Host "⏳ Waiting for application to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🔍 Health check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend health check failed. Checking PM2 status..." -ForegroundColor Red
    pm2 status
    pm2 logs attendance-app --lines 20
}

Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "📊 PM2 Status:" -ForegroundColor Cyan
pm2 status

Write-Host "🌐 Application should be accessible at:" -ForegroundColor Cyan
Write-Host "   - https://zatint1991.com/" -ForegroundColor White
Write-Host "   - https://zatint1991.com/admin-dashboard-2024" -ForegroundColor White
