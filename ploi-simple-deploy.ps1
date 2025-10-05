# Exit immediately if a command exits with a non-zero status.
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Plio Simple Deployment (No node_modules operations)..."

# Define deployment directories
$APP_DIR = "/home/zatint1991-hvt55/zatint1991.com"
$FRONTEND_DIR = "$APP_DIR/frontend"
$BACKEND_DIR = "$APP_DIR/backend"
$DATA_DIR = "$APP_DIR/data"

# Ensure the application directory exists
Write-Host "📍 Current directory: $(pwd)"
if (-not (Test-Path $APP_DIR)) {
  Write-Host "Application directory $APP_DIR not found. Please ensure the repository is cloned there."
  exit 1
}

Set-Location $APP_DIR

# Fetch the latest code from Git
Write-Host "📥 Fetching latest code from Git..."
git pull origin main

# --- Frontend Deployment ---
Write-Host "🌐 Deploying Frontend..."
Set-Location $FRONTEND_DIR

Write-Host "🧹 Cleaning up old frontend build artifacts (NO node_modules touch)..."
Remove-Item -Recurse -Force dist, .vite-temp, tsconfig.tsbuildinfo -ErrorAction SilentlyContinue

Write-Host "🏗️ Building frontend for production..."
npm run build

# Copy frontend build to the public directory expected by Nginx
Write-Host "📋 Copying frontend build to Nginx public directory..."
$PUBLIC_HTML_DIR = "/home/zatint1991-hvt55/zatint1991.com/public"
New-Item -ItemType Directory -Force -Path $PUBLIC_HTML_DIR
Remove-Item -Recurse -Force "$PUBLIC_HTML_DIR/*" -ErrorAction SilentlyContinue # Clear existing public files
Copy-Item -Recurse -Path dist/* -Destination "$PUBLIC_HTML_DIR/"

Write-Host "✅ Frontend deployment complete."

# --- Backend Deployment ---
Write-Host "⚙️ Deploying Backend..."
Set-Location $BACKEND_DIR

Write-Host "🧹 Cleaning up old backend build artifacts (NO node_modules touch)..."
Remove-Item -Recurse -Force dist, tsconfig.tsbuildinfo -ErrorAction SilentlyContinue

Write-Host "🏗️ Building backend for production..."
npm run build

# Ensure data directory exists and is writable
Write-Host "📂 Ensuring data directory exists: $DATA_DIR"
New-Item -ItemType Directory -Force -Path $DATA_DIR
Set-ACL -Path $DATA_DIR -AcL (Get-ACL $DATA_DIR | ForEach-Object { $_.SetAccessRuleProtection($true, $true); $_.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow"))) })

# Restart PM2 process
Write-Host "🔄 Restarting backend application with PM2..."
pm2 restart attendance-app
if ($LASTEXITCODE -ne 0) {
  Write-Host "PM2 process 'attendance-app' not found, starting new one..."
  pm2 start dist/index.js --name "attendance-app" --env production --watch --ignore-watch="data/*"
}

Write-Host "✅ Backend deployment complete."

Write-Host "🎉 Simple deployment finished successfully!"
Write-Host "🌐 Check your application at: https://zatint1991.com"
