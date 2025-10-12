# 本番環境API修正デプロイスクリプト
param(
    [string]$Server = "root@vps-2025-08-19-09-32-13"
)

Write-Host "🚀 本番環境API修正デプロイを開始します..." -ForegroundColor Green
Write-Host "サーバー: $Server" -ForegroundColor Cyan

try {
    # 1. フロントエンドビルド
    Write-Host "📦 フロントエンドをビルド中..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンドのビルドに失敗しました" -ForegroundColor Red
        exit 1
    }
    Set-Location ..

    # 2. 本番サーバーにファイルをコピー
    Write-Host "📤 本番サーバーにファイルをコピー中..." -ForegroundColor Yellow
    
    # フロントエンドファイルをコピー
    $frontendPath = "frontend/dist/*"
    $targetPath = "${Server}:/home/itoshu/projects/kintai/public/"
    scp -r $frontendPath $targetPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンドファイルのコピーに失敗しました" -ForegroundColor Red
        exit 1
    }

    # バックエンドファイルをコピー
    $backendPath = "backend/dist/*"
    $backendTargetPath = "${Server}:/home/itoshu/projects/kintai/backend/dist/"
    scp -r $backendPath $backendTargetPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドファイルのコピーに失敗しました" -ForegroundColor Red
        exit 1
    }

    # 3. 本番サーバーでバックエンドを再起動
    Write-Host "🔄 本番サーバーでバックエンドを再起動中..." -ForegroundColor Yellow
    $restartCommand = "cd /home/itoshu/projects/kintai && pm2 restart kintai-backend"
    ssh $Server $restartCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドの再起動に失敗しました" -ForegroundColor Red
        exit 1
    }

    # 4. 起動を待つ
    Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # 5. ヘルスチェック
    Write-Host "🔍 ヘルスチェックを実行中..." -ForegroundColor Yellow
    
    # 本番API確認
    try {
        $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 本番API エンドポイントが正常に動作しています" -ForegroundColor Green
        } else {
            Write-Host "❌ 本番API エンドポイントの確認に失敗しました (ステータス: $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ 本番API エンドポイントに接続できません: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 6. 完了メッセージ
    Write-Host ""
    Write-Host "🎉 デプロイが完了しました！" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 アクセス先:" -ForegroundColor Cyan
    Write-Host "  メイン: https://zatint1991.com" -ForegroundColor White
    Write-Host "  API: https://zatint1991.com/api/admin" -ForegroundColor White
    Write-Host "  ヘルスチェック: https://zatint1991.com/api/admin/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 管理コマンド:" -ForegroundColor Cyan
    Write-Host "  PM2ステータス: pm2 list" -ForegroundColor White
    Write-Host "  PM2ログ: pm2 logs kintai-backend" -ForegroundColor White
    Write-Host "  PM2再起動: pm2 restart kintai-backend" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ デプロイ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-backend --lines 50" -ForegroundColor White
    exit 1
}