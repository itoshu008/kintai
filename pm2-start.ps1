# PM2起動スクリプト
# 使用方法: .\pm2-start.ps1

Write-Host "🚀 PM2でバックエンドサーバーを起動中..." -ForegroundColor Green

try {
    # 1. 現在のディレクトリを確認
    Write-Host "📁 現在のディレクトリ: $(Get-Location)" -ForegroundColor Yellow

    # 2. バックエンドディレクトリに移動
    Set-Location backend

    # 3. 環境変数ファイルをコピー
    Write-Host "⚙️ 環境変数を設定中..." -ForegroundColor Yellow
    if (Test-Path "env.production") {
        Copy-Item "env.production" ".env" -Force
        Write-Host "✅ 本番環境変数をコピーしました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ env.production が見つかりません" -ForegroundColor Red
        exit 1
    }

    # 4. 依存関係をインストール
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
    npm ci

    # 5. ビルド
    Write-Host "🔨 バックエンドをビルド中..." -ForegroundColor Yellow
    npm run build

    # 6. ビルドされたファイルの存在確認
    Write-Host "🔍 ビルドファイルを確認中..." -ForegroundColor Yellow
    if (Test-Path "dist/index.js") {
        Write-Host "✅ dist/index.js が見つかりました" -ForegroundColor Green
    } else {
        Write-Host "❌ dist/index.js が見つかりません" -ForegroundColor Red
        exit 1
    }

    # 7. 既存のPM2プロセスを停止
    Write-Host "🛑 既存のPM2プロセスを停止中..." -ForegroundColor Yellow
    pm2 stop kintai-api 2>$null
    pm2 delete kintai-api 2>$null

    # 8. PM2でサーバーを起動
    Write-Host "🚀 PM2でサーバーを起動中..." -ForegroundColor Yellow
    
    # 方法1: 直接ファイルを指定
    Write-Host "方法1: 直接ファイルを指定して起動" -ForegroundColor Cyan
    pm2 start dist/index.js --name kintai-api --env production

    # 9. 起動を待つ
    Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # 10. PM2ステータスを確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 11. ログを確認
    Write-Host "📋 最新のログ:" -ForegroundColor Cyan
    pm2 logs kintai-api --lines 10

    # 12. ヘルスチェックをテスト
    Write-Host "🏥 ヘルスチェックをテスト中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # ローカルテスト
    Write-Host "ローカルヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ ローカルヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ ローカルヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 本番テスト
    Write-Host "本番ヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ 本番ヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 本番ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 13. ポート確認
    Write-Host "🔌 ポート8001の使用状況:" -ForegroundColor Cyan
    try {
        $portCheck = netstat -an | Select-String ":8001"
        if ($portCheck) {
            Write-Host "✅ ポート8001でリスニング中" -ForegroundColor Green
            Write-Host $portCheck
        } else {
            Write-Host "❌ ポート8001でリスニングしていません" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️ ポート確認でエラー: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "✅ PM2起動完了！" -ForegroundColor Green

} catch {
    Write-Host "❌ PM2起動中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-api --lines 50" -ForegroundColor White
    exit 1
} finally {
    # 元のディレクトリに戻る
    Set-Location ..
}
