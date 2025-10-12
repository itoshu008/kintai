# 包括的なシステム診断スクリプト
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  包括的なシステム診断スクリプト" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. PM2の状態
Write-Host "`n[1] PM2プロセスの状態" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue
pm2 list

# 2. フロントエンドビルドの確認
Write-Host "`n[2] フロントエンドビルドの確認" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

$frontendDistPath = "frontend\dist"
if (Test-Path $frontendDistPath) {
    Write-Host "✅ フロントエンドディレクトリが存在します: $frontendDistPath" -ForegroundColor Green
    
    if (Test-Path "$frontendDistPath\index.html") {
        Write-Host "✅ index.html が存在します" -ForegroundColor Green
    } else {
        Write-Host "❌ index.html が見つかりません" -ForegroundColor Red
    }
    
    Write-Host "`nフロントエンドファイル一覧:" -ForegroundColor Yellow
    Get-ChildItem $frontendDistPath | Select-Object Name,Length | Format-Table
} else {
    Write-Host "❌ フロントエンドディレクトリが見つかりません: $frontendDistPath" -ForegroundColor Red
}

# 3. バックエンド設定の確認
Write-Host "`n[3] バックエンド設定の確認" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

Write-Host "環境変数:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "  PORT: 8001 (固定)" -ForegroundColor Cyan
Write-Host "  HOST: 0.0.0.0 (PM2設定)" -ForegroundColor Cyan

# 4. ポート使用状況
Write-Host "`n[4] ポート8001の使用状況" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

$portInfo = netstat -ano | findstr :8001
if ($portInfo) {
    Write-Host "✅ ポート8001は使用中です" -ForegroundColor Green
    Write-Host $portInfo -ForegroundColor Yellow
} else {
    Write-Host "❌ ポート8001は使用されていません" -ForegroundColor Red
}

# 5. エンドポイントテスト
Write-Host "`n[5] エンドポイントテスト" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

$endpoints = @(
    @{Name="メインページ"; Path="/"},
    @{Name="API基本"; Path="/api/admin"},
    @{Name="ヘルスチェック"; Path="/api/admin/health"},
    @{Name="部署一覧"; Path="/api/admin/departments"},
    @{Name="社員一覧"; Path="/api/admin/employees"},
    @{Name="マスターデータ"; Path="/api/admin/master"},
    @{Name="マスターページ(/m)"; Path="/m"},
    @{Name="マスターページ(/master)"; Path="/master"},
    @{Name="旧マスターページ"; Path="/admin-dashboard-2024"},
    @{Name="パーソナルページ(/p)"; Path="/p"},
    @{Name="パーソナルページ(/personal)"; Path="/personal"}
)

$successCount = 0
$errorCount = 0

foreach ($endpoint in $endpoints) {
    $url = "http://localhost:8001$($endpoint.Path)"
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($endpoint.Name) - OK" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $($endpoint.Name) - エラー ($($response.StatusCode))" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "❌ $($endpoint.Name) - 接続エラー" -ForegroundColor Red
        $errorCount++
    }
}

# 6. PM2ログの確認
Write-Host "`n[6] PM2ログ（最新10行）" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue
pm2 logs kintai-backend --lines 10 --nostream

# 7. 統計サマリー
Write-Host "`n[7] 統計サマリー" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

$total = $successCount + $errorCount
$successRate = if ($total -gt 0) { [math]::Round(($successCount * 100) / $total, 2) } else { 0 }

Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "❌ エラー: $errorCount" -ForegroundColor Red
Write-Host "📈 成功率: ${successRate}%" -ForegroundColor Blue

# 8. システムの健全性評価
Write-Host "`n[8] システムの健全性評価" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue

if ($errorCount -eq 0) {
    Write-Host "🎉 システムは完全に正常に動作しています！" -ForegroundColor Green
    Write-Host "" 
    Write-Host "✅ フロントエンドのビルドが完了している" -ForegroundColor Green
    Write-Host "✅ バックエンドが正常に動作している" -ForegroundColor Green
    Write-Host "✅ 静的ファイル配信が正しく設定されている" -ForegroundColor Green
    Write-Host "✅ 全てのエンドポイントが200 OKを返している" -ForegroundColor Green
} else {
    Write-Host "⚠️ いくつかの問題が検出されました" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "推奨アクション:" -ForegroundColor Yellow
    Write-Host "  1. PM2ログを確認: pm2 logs kintai-backend" -ForegroundColor Yellow
    Write-Host "  2. バックエンドを再起動: pm2 restart kintai-backend" -ForegroundColor Yellow
    Write-Host "  3. フロントエンドを再ビルド: cd frontend; npm run build" -ForegroundColor Yellow
}

# 9. 重要な設定ファイル
Write-Host "`n[9] 重要な設定ファイル" -ForegroundColor Blue
Write-Host "----------------------------------------" -ForegroundColor Blue
Write-Host "  • バックエンドルーティング: backend/src/index.ts" -ForegroundColor Cyan
Write-Host "  • バックエンド起動: backend/src/server.ts" -ForegroundColor Cyan
Write-Host "  • PM2設定: ecosystem.config.js" -ForegroundColor Cyan
Write-Host "  • 本番環境変数: backend/env.production" -ForegroundColor Cyan
Write-Host "  • フロントエンドルーティング: frontend/src/App.tsx" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  診断完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
