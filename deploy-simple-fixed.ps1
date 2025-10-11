# シンプル修正版デプロイスクリプト
# 使用方法: .\deploy-simple-fixed.ps1

Write-Host "🚀 シンプルデプロイを開始..." -ForegroundColor Green

try {
    # 1. 最新コードを取得
    Write-Host "📥 最新コードを取得中..." -ForegroundColor Yellow
    git fetch origin
    git reset --hard origin/main

    # 2. バックエンドをセットアップ
    Write-Host "🔨 バックエンドをセットアップ中..." -ForegroundColor Yellow
    Set-Location backend
    Copy-Item "env.production" ".env" -Force
    npm ci
    npm run build
    Set-Location ..

    # 3. フロントエンドをセットアップ
    Write-Host "🎨 フロントエンドをセットアップ中..." -ForegroundColor Yellow
    Set-Location frontend
    npm ci
    npm run build
    Set-Location ..

    # 4. PM2で再起動
    Write-Host "🚀 PM2で再起動中..." -ForegroundColor Yellow
    pm2 stop kintai-api 2>$null
    pm2 delete kintai-api 2>$null
    pm2 start backend/dist/index.js --name kintai-api --env production

    # 5. 待機
    Start-Sleep -Seconds 3

    # 6. ステータス確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 7. ヘルスチェック
    Write-Host "🏥 ヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "✅ シンプルデプロイ完了！" -ForegroundColor Green

} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "ログ確認: pm2 logs kintai-api --lines 20" -ForegroundColor Yellow
}
