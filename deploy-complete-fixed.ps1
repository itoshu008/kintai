# 修正版完全デプロイスクリプト
# 使用方法: .\deploy-complete-fixed.ps1

Write-Host "🚀 修正版完全デプロイを開始..." -ForegroundColor Green

try {
    # 1. 最新のコードを取得
    Write-Host "📥 最新のコードを取得中..." -ForegroundColor Yellow
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

    # 2. 環境変数ファイルをコピー
    Write-Host "⚙️ 環境変数を設定中..." -ForegroundColor Yellow
    if (Test-Path "backend/env.production") {
        Copy-Item "backend/env.production" "backend/.env" -Force
        Write-Host "✅ 本番環境変数をコピーしました" -ForegroundColor Green
    } else {
        Write-Host "⚠️ env.production が見つかりません。env.example を使用します" -ForegroundColor Yellow
        if (Test-Path "backend/env.example") {
            Copy-Item "backend/env.example" "backend/.env" -Force
        } else {
            Write-Host "❌ 環境変数ファイルが見つかりません" -ForegroundColor Red
            exit 1
        }
    }

    # 3. バックエンドのセットアップ
    Write-Host "🔨 バックエンドをセットアップ中..." -ForegroundColor Yellow
    Set-Location backend
    
    # 依存関係をインストール
    Write-Host "📦 バックエンド依存関係をインストール中..." -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンド依存関係のインストールに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }

    # ビルド
    Write-Host "🔨 バックエンドをビルド中..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドビルドに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }

    # 元のディレクトリに戻る
    Set-Location ..

    # 4. フロントエンドのセットアップ
    Write-Host "🎨 フロントエンドをセットアップ中..." -ForegroundColor Yellow
    Set-Location frontend
    
    # 依存関係をインストール
    Write-Host "📦 フロントエンド依存関係をインストール中..." -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンド依存関係のインストールに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }

    # ビルド
    Write-Host "🎨 フロントエンドをビルド中..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ フロントエンドビルドに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }

    # 元のディレクトリに戻る
    Set-Location ..

    # 5. PM2でバックエンドを起動
    Write-Host "🚀 バックエンドを起動中..." -ForegroundColor Yellow
    
    # 既存プロセスを停止
    Write-Host "🛑 既存のPM2プロセスを停止中..." -ForegroundColor Yellow
    pm2 stop kintai-api 2>$null
    pm2 delete kintai-api 2>$null

    # バックエンドを起動
    Write-Host "🚀 バックエンドを起動中..." -ForegroundColor Yellow
    pm2 start backend/dist/index.js --name kintai-api --env production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ バックエンドの起動に失敗しました" -ForegroundColor Red
        exit 1
    }

    # 6. 起動を待つ
    Write-Host "⏳ サーバー起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # 7. ステータス確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 8. ヘルスチェックテスト
    Write-Host "🏥 ヘルスチェックをテスト中..." -ForegroundColor Yellow

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

    Write-Host "✅ 修正版完全デプロイ完了！" -ForegroundColor Green

} catch {
    Write-Host "❌ デプロイ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 詳細なログを確認してください:" -ForegroundColor Yellow
    Write-Host "pm2 logs kintai-api --lines 50" -ForegroundColor White
    exit 1
}
