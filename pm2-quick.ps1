# 簡易PM2起動スクリプト
# 使用方法: .\pm2-quick.ps1

Write-Host "🚀 簡易PM2起動を開始..." -ForegroundColor Green

try {
    # 1. バックエンドディレクトリに移動
    Set-Location backend

    # 2. 環境変数を設定
    if (Test-Path "env.production") {
        Copy-Item "env.production" ".env" -Force
        Write-Host "✅ 環境変数を設定しました" -ForegroundColor Green
    }

    # 3. ビルド
    Write-Host "🔨 ビルド中..." -ForegroundColor Yellow
    npm run build

    # 4. 既存プロセスを停止
    pm2 stop kintai-api 2>$null
    pm2 delete kintai-api 2>$null

    # 5. PM2で起動
    Write-Host "🚀 PM2で起動中..." -ForegroundColor Yellow
    pm2 start dist/index.js --name kintai-api --env production

    # 6. 待機
    Start-Sleep -Seconds 3

    # 7. ステータス確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 8. ヘルスチェック
    Write-Host "🏥 ヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "✅ 簡易起動完了！" -ForegroundColor Green

} catch {
    Write-Host "❌ エラー: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "ログ確認: pm2 logs kintai-api --lines 20" -ForegroundColor Yellow
} finally {
    Set-Location ..
}
