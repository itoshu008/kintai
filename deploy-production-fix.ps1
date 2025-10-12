# 勤怠管理システム - 本番環境修正デプロイスクリプト (PowerShell版)
# APIプロキシ問題の修正

Write-Host "🚀 本番環境修正デプロイ開始" -ForegroundColor Green

try {
    # 1. 現在のディレクトリを確認
    Write-Host "現在のディレクトリ: $(Get-Location)" -ForegroundColor Yellow

    # 2. 最新のコードを取得
    Write-Host "最新のコードを取得中..." -ForegroundColor Yellow
    git fetch origin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Git fetch に失敗しました" -ForegroundColor Red
        exit 1
    }
    
    git reset --hard origin/main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Git reset に失敗しました" -ForegroundColor Red
        exit 1
    }

    # 3. 依存関係のインストール
    Write-Host "依存関係をインストール中..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依存関係のインストールに失敗しました" -ForegroundColor Red
        exit 1
    }

    # バックエンド
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンド依存関係のインストールに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..

    # フロントエンド
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンド依存関係のインストールに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..

    # 4. 本番用ビルド
    Write-Host "本番用ビルドを作成中..." -ForegroundColor Yellow
    
    # バックエンドビルド
    Set-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドビルドに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..

    # フロントエンドビルド
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンドビルドに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..

    # 5. 環境変数の設定
    Write-Host "本番環境用の環境変数を設定中..." -ForegroundColor Yellow
    $env:NODE_ENV = "production"
    $env:PORT = "8001"
    $env:HOST = "0.0.0.0"
    $env:TZ = "Asia/Tokyo"

    # 6. PM2プロセスの停止と再起動
    Write-Host "PM2プロセスを再起動中..." -ForegroundColor Yellow
    pm2 stop kintai-backend 2>$null
    pm2 delete kintai-backend 2>$null

    # 7. バックエンドを起動
    Write-Host "バックエンドを起動中..." -ForegroundColor Yellow
    pm2 start backend/dist/index.js --name kintai-backend --env production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドの起動に失敗しました" -ForegroundColor Red
        exit 1
    }

    # 8. 起動を待つ
    Write-Host "サーバー起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # 9. ヘルスチェック
    Write-Host "ヘルスチェックを実行中..." -ForegroundColor Yellow

    # ローカルAPI確認
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ ローカルAPI エンドポイントが正常に動作しています" -ForegroundColor Green
        } else {
            Write-Host "❌ ローカルAPI エンドポイントの確認に失敗しました (ステータス: $($response.StatusCode))" -ForegroundColor Red
            pm2 logs kintai-backend --lines 20
            exit 1
        }
    } catch {
        Write-Host "❌ ローカルAPI エンドポイントの確認に失敗しました: $($_.Exception.Message)" -ForegroundColor Red
        pm2 logs kintai-backend --lines 20
        exit 1
    }

    # 10. PM2ステータスの表示
    Write-Host "PM2プロセスの状況:" -ForegroundColor Cyan
    pm2 list

    # 11. ログの表示
    Write-Host "アプリケーションログ:" -ForegroundColor Cyan
    pm2 logs kintai-backend --lines 10

    Write-Host ""
    Write-Host "🎉 本番環境修正デプロイが完了しました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 アクセスURL:" -ForegroundColor Cyan
    Write-Host "  メイン: https://zatint1991.com" -ForegroundColor White
    Write-Host "  API: https://zatint1991.com/api/admin" -ForegroundColor White
    Write-Host "  ヘルスチェック: https://zatint1991.com/api/admin/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 管理コマンド:" -ForegroundColor Cyan
    Write-Host "  PM2ステータス: pm2 list" -ForegroundColor White
    Write-Host "  PM2ログ: pm2 logs kintai-backend" -ForegroundColor White
    Write-Host "  PM2再起動: pm2 restart kintai-backend" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Nginx設定更新が必要な場合:" -ForegroundColor Yellow
    Write-Host "  sudo cp nginx-zatint1991-fixed.conf /etc/nginx/sites-available/zatint1991.com" -ForegroundColor White
    Write-Host "  sudo nginx -t" -ForegroundColor White
    Write-Host "  sudo systemctl restart nginx" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ デプロイ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-backend --lines 50" -ForegroundColor White
    exit 1
}
