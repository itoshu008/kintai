# 完全なデプロイスクリプト - ヘルスチェックエンドポイント修正版 (PowerShell版)
# 使用方法: .\deploy-complete.ps1

Write-Host "🚀 完全なデプロイを開始..." -ForegroundColor Green

try {
    # 1. 最新のコードを取得
    Write-Host "📥 最新のコードを取得中..." -ForegroundColor Yellow
    git fetch origin
    git reset --hard origin/main

    # 2. 環境変数ファイルをコピー
    Write-Host "⚙️ 環境変数を設定中..." -ForegroundColor Yellow
    if (Test-Path "backend/env.production") {
        Copy-Item "backend/env.production" "backend/.env"
        Write-Host "✅ 本番環境変数をコピーしました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ env.production が見つかりません。env.example を使用します" -ForegroundColor Yellow
        Copy-Item "backend/env.example" "backend/.env"
    }

    # 3. 依存関係をインストール
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
    Set-Location backend
    npm ci
    Set-Location ../frontend
    npm ci
    Set-Location ..

    # 4. バックエンドをビルド
    Write-Host "🔨 バックエンドをビルド中..." -ForegroundColor Yellow
    Set-Location backend
    npm run build
    Set-Location ..

    # 5. フロントエンドをビルド
    Write-Host "🎨 フロントエンドをビルド中..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    Set-Location ..

    # 6. PM2でアプリケーションを再起動
    Write-Host "🔄 アプリケーションを再起動中..." -ForegroundColor Yellow
    pm2 restart all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ PM2 restart failed, trying to start..." -ForegroundColor Yellow
        pm2 start backend/dist/index.js --name kintai-api
    }

    # 7. ヘルスチェックをテスト
    Write-Host "🏥 ヘルスチェックをテスト中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # ローカルテスト
    Write-Host "ローカルヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing
        Write-Host "✅ ローカルヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host $response.Content
    } catch {
        Write-Host "❌ ローカルヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 本番テスト
    Write-Host "本番ヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/health" -UseBasicParsing
        Write-Host "✅ 本番ヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host $response.Content
    } catch {
        Write-Host "❌ 本番ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "✅ デプロイ完了！" -ForegroundColor Green
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    Write-Host "📋 ログ確認コマンド:" -ForegroundColor Cyan
    Write-Host "pm2 logs kintai-api --lines 20" -ForegroundColor White

    Write-Host "🔍 ヘルスチェックコマンド:" -ForegroundColor Cyan
    Write-Host "curl http://localhost:8001/api/admin/health" -ForegroundColor White
    Write-Host "curl https://zatint1991.com/api/admin/health" -ForegroundColor White

} catch {
    Write-Host "❌ デプロイ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
