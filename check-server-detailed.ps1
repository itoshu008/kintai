# 包括的なサーバー診断スクリプト
Write-Host "🔍 包括的なサーバー診断スクリプト" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. PM2ステータスの確認
Write-Host "`n📊 PM2ステータス" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
pm2 list

# 2. ポート使用状況の確認
Write-Host "`n🔌 ポート8001の使用状況" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
$portInfo = netstat -ano | findstr :8001
if ($portInfo) {
    Write-Host $portInfo -ForegroundColor Yellow
    
    # プロセス情報を取得
    $portInfo | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  → PID $pid`: $($process.ProcessName) (起動時刻: $($process.StartTime))" -ForegroundColor Cyan
            }
        }
    }
} else {
    Write-Host "ポート8001は使用されていません" -ForegroundColor Red
}

# 3. バックエンドログの確認（最新20行）
Write-Host "`n📝 バックエンドログ（最新20行）" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
pm2 logs kintai-backend --lines 20 --nostream

# 4. ルーティング設定の確認
Write-Host "`n🛣️  ルーティング設定の確認" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

$routeChecks = @{
    "メインページ" = "/"
    "API基本" = "/api/admin"
    "ヘルスチェック" = "/api/admin/health"
    "部署一覧" = "/api/admin/departments"
    "社員一覧" = "/api/admin/employees"
    "マスターデータ" = "/api/admin/master"
    "マスターページ(/m)" = "/m"
    "マスターページ(/master)" = "/master"
    "旧マスターページ" = "/admin-dashboard-2024"
    "パーソナルページ(/p)" = "/p"
    "パーソナルページ(/personal)" = "/personal"
}

Write-Host "以下のルートが正しく設定されているか確認してください:"
foreach ($name in $routeChecks.Keys) {
    Write-Host "  • $name`: $($routeChecks[$name])" -ForegroundColor Yellow
}

# 5. API エンドポイントのテスト
Write-Host "`n🧪 APIエンドポイントのテスト" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

$successCount = 0
$errorCount = 0

foreach ($name in $routeChecks.Keys) {
    $path = $routeChecks[$name]
    $url = "http://localhost:8001$path"
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $name`: $path - OK" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $name`: $path - エラー ($($response.StatusCode))" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "❌ $name`: $path - 接続エラー: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

# 6. 統計サマリー
Write-Host "`n📊 診断結果サマリー" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "❌ エラー: $errorCount" -ForegroundColor Red

$successRate = if (($successCount + $errorCount) -gt 0) { 
    [math]::Round(($successCount * 100) / ($successCount + $errorCount), 2) 
} else { 
    0 
}
Write-Host "📈 成功率: ${successRate}%" -ForegroundColor Blue

# 7. 推奨アクション
Write-Host "`n🎯 推奨アクション" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($errorCount -eq 0) {
    Write-Host "• 全てのエンドポイントが正常に動作しています！" -ForegroundColor Green
    Write-Host "• サーバーのルーティング設定は正しく構成されています。" -ForegroundColor Green
} else {
    Write-Host "• エラーが発生したエンドポイントを確認してください" -ForegroundColor Yellow
    Write-Host "• バックエンドのルーティング設定を確認: backend/src/index.ts" -ForegroundColor Yellow
    Write-Host "• PM2ログを確認: pm2 logs kintai-backend" -ForegroundColor Yellow
    Write-Host "• バックエンドを再起動: pm2 restart kintai-backend" -ForegroundColor Yellow
}

# 8. バックエンド設定ファイルの確認
Write-Host "`n📄 バックエンド設定ファイル" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host "• ルーティング設定: backend/src/index.ts" -ForegroundColor Yellow
Write-Host "• サーバー起動設定: backend/src/server.ts" -ForegroundColor Yellow
Write-Host "• 環境変数: backend/env.production" -ForegroundColor Yellow

Write-Host "`n🔍 診断完了" -ForegroundColor Cyan
