# 勤怠管理システム - zatint1991.com デプロイスクリプト (PowerShell版)
# 本番環境用デプロイ

Write-Host "🚀 勤怠管理システム - zatint1991.com デプロイ開始" -ForegroundColor Green

# 1. 依存関係のインストール
Write-Host "依存関係をインストール中..." -ForegroundColor Yellow
npm install
Set-Location backend
npm install
Set-Location ..
Set-Location frontend
npm install
Set-Location ..

# 2. 本番用ビルド
Write-Host "本番用ビルドを作成中..." -ForegroundColor Yellow
npm run build

# 3. PM2プロセスの停止
Write-Host "既存のPM2プロセスを停止中..." -ForegroundColor Yellow
pm2 stop kintai-backend 2>$null

# 4. 本番環境用の環境変数を設定
Write-Host "本番環境用の環境変数を設定中..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
$env:PORT = "8001"
$env:HOST = "0.0.0.0"
$env:TZ = "Asia/Tokyo"

# 5. PM2で本番環境を起動
Write-Host "本番環境を起動中..." -ForegroundColor Yellow
pm2 start ecosystem.config.js --env production

# 6. ヘルスチェック
Write-Host "ヘルスチェックを実行中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# API エンドポイントの確認
Write-Host "API エンドポイントを確認中..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/admin" -UseBasicParsing
    if ($apiResponse.StatusCode -eq 200) {
        Write-Host "✅ API エンドポイントが正常に動作しています" -ForegroundColor Green
    } else {
        Write-Host "❌ API エンドポイントの確認に失敗しました" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ API エンドポイントの確認に失敗しました" -ForegroundColor Red
    exit 1
}

# フロントエンドの確認
Write-Host "フロントエンドを確認中..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:8001" -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ フロントエンドが正常に動作しています" -ForegroundColor Green
    } else {
        Write-Host "❌ フロントエンドの確認に失敗しました" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ フロントエンドの確認に失敗しました" -ForegroundColor Red
    exit 1
}

# 7. PM2ステータスの表示
Write-Host "PM2プロセスの状況:" -ForegroundColor Yellow
pm2 list

# 8. ログの表示
Write-Host "アプリケーションログ:" -ForegroundColor Yellow
pm2 logs kintai-backend --lines 10

Write-Host ""
Write-Host "🎉 デプロイが完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 アクセスURL:" -ForegroundColor Cyan
Write-Host "  メイン: https://zatint1991.com" -ForegroundColor White
Write-Host "  マスターページ: https://zatint1991.com/master" -ForegroundColor White
Write-Host "  パーソナルページ: https://zatint1991.com/personal" -ForegroundColor White
Write-Host ""
Write-Host "📊 管理コマンド:" -ForegroundColor Cyan
Write-Host "  PM2ステータス: pm2 list" -ForegroundColor White
Write-Host "  PM2ログ: pm2 logs kintai-backend" -ForegroundColor White
Write-Host "  PM2再起動: pm2 restart kintai-backend" -ForegroundColor White
Write-Host "  PM2停止: pm2 stop kintai-backend" -ForegroundColor White
Write-Host ""