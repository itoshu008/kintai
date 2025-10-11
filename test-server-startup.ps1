# サーバー起動テストスクリプト
# 使用方法: .\test-server-startup.ps1

Write-Host "🔍 バックエンドサーバーの起動状況を確認中..." -ForegroundColor Green

try {
    # 1. 現在のディレクトリを確認
    Write-Host "📁 現在のディレクトリ: $(Get-Location)" -ForegroundColor Yellow

    # 2. 環境変数ファイルをコピー
    Write-Host "⚙️ 環境変数を設定中..." -ForegroundColor Yellow
    if (Test-Path "backend/env.production") {
        Copy-Item "backend/env.production" "backend/.env" -Force
        Write-Host "✅ 本番環境変数をコピーしました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ env.production が見つかりません" -ForegroundColor Red
        exit 1
    }

    # 3. バックエンドディレクトリに移動
    Set-Location backend

    # 4. 依存関係をインストール
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
    npm ci

    # 5. ビルド
    Write-Host "🔨 バックエンドをビルド中..." -ForegroundColor Yellow
    npm run build

    # 6. PM2でサーバーを起動/再起動
    Write-Host "🚀 サーバーを起動中..." -ForegroundColor Yellow
    pm2 stop kintai-api 2>$null
    pm2 start dist/index.js --name kintai-api --env production

    # 7. 起動を待つ
    Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # 8. PM2ステータスを確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 9. ログを確認
    Write-Host "📋 最新のログ:" -ForegroundColor Cyan
    pm2 logs kintai-api --lines 10

    # 10. ヘルスチェックをテスト
    Write-Host "🏥 ヘルスチェックをテスト中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # ローカルテスト
    Write-Host "ローカルヘルスチェック:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/health" -UseBasicParsing -TimeoutSec 10
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

    # 11. ポート確認
    Write-Host "🔌 ポート3000の使用状況:" -ForegroundColor Cyan
    try {
        $portCheck = netstat -an | Select-String ":3000"
        if ($portCheck) {
            Write-Host "✅ ポート3000でリスニング中" -ForegroundColor Green
            Write-Host $portCheck
        } else {
            Write-Host "❌ ポート3000でリスニングしていません" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️ ポート確認でエラー: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "✅ サーバー起動テスト完了！" -ForegroundColor Green

} catch {
    Write-Host "❌ サーバー起動テスト中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-api --lines 50" -ForegroundColor White
    exit 1
} finally {
    # 元のディレクトリに戻る
    Set-Location ..
}
