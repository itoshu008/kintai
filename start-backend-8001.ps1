# バックエンド8001ポート固定起動スクリプト
# 使用方法: .\start-backend-8001.ps1

Write-Host "🚀 バックエンドを8001ポートで固定起動中..." -ForegroundColor Green

try {
    # 1. バックエンドディレクトリに移動
    Set-Location backend

    # 2. 環境変数を設定
    Write-Host "⚙️ 環境変数を設定中..." -ForegroundColor Yellow
    if (Test-Path "env.production") {
        Copy-Item "env.production" ".env" -Force
        Write-Host "✅ 本番環境変数をコピーしました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ env.production が見つかりません" -ForegroundColor Red
        exit 1
    }

    # 3. 依存関係をインストール
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
    npm ci

    # 4. ビルド
    Write-Host "🔨 バックエンドをビルド中..." -ForegroundColor Yellow
    npm run build

    # 5. ビルドファイルの確認
    Write-Host "🔍 ビルドファイルを確認中..." -ForegroundColor Yellow
    if (Test-Path "dist/index.js") {
        Write-Host "✅ dist/index.js が見つかりました" -ForegroundColor Green
    } else {
        Write-Host "❌ dist/index.js が見つかりません" -ForegroundColor Red
        exit 1
    }

    # 6. 既存のPM2プロセスを停止
    Write-Host "🛑 既存のPM2プロセスを停止中..." -ForegroundColor Yellow
    pm2 stop kintai-api 2>$null
    pm2 delete kintai-api 2>$null

    # 7. ポート8001が使用中かチェック
    Write-Host "🔌 ポート8001の使用状況を確認中..." -ForegroundColor Yellow
    try {
        $portCheck = netstat -an | Select-String ":8001"
        if ($portCheck) {
            Write-Host "⚠️ ポート8001が既に使用されています" -ForegroundColor Yellow
            Write-Host "使用中のプロセス:" -ForegroundColor Cyan
            Write-Host $portCheck
            Write-Host "プロセスを終了してから再試行してください" -ForegroundColor Yellow
        } else {
            Write-Host "✅ ポート8001は利用可能です" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ ポート確認でエラー: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # 8. PM2でサーバーを起動（8001ポート固定）
    Write-Host "🚀 PM2でサーバーを起動中（ポート8001固定）..." -ForegroundColor Yellow
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

    # 12. ポート8001の確認
    Write-Host "🔌 ポート8001の確認:" -ForegroundColor Cyan
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

    # 13. ヘルスチェックをテスト
    Write-Host "🏥 ヘルスチェックをテスト中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # ローカルテスト
    Write-Host "ローカルヘルスチェック (http://localhost:8001/api/admin/health):" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 部署APIテスト
    Write-Host "部署APIテスト (http://localhost:8001/api/admin/departments):" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/departments" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "✅ バックエンド8001ポート固定起動完了！" -ForegroundColor Green
    Write-Host "📋 確認コマンド:" -ForegroundColor Cyan
    Write-Host "pm2 status" -ForegroundColor White
    Write-Host "pm2 logs kintai-api --lines 20" -ForegroundColor White
    Write-Host "curl http://localhost:8001/api/admin/health" -ForegroundColor White

} catch {
    Write-Host "❌ 起動中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-api --lines 50" -ForegroundColor White
    exit 1
} finally {
    # 元のディレクトリに戻る
    Set-Location ..
}
