# 🤖 Cursor用GitHubデプロイ指示書

## 📋 Cursorに出す指示例

### 基本的なデプロイ指示

```
GitHubリポジトリ https://github.com/itoshu008/kintai.git から最新のコードを取得して、サーバーにデプロイしてください。

手順：
1. リポジトリをクローンまたはプル
2. 依存関係をインストール
3. バックエンドとフロントエンドをビルド
4. PM2でプロセスを再起動
5. ヘルスチェックを実行

環境設定：
- バックエンドポート: 8000
- フロントエンド: Viteビルド
- プロセス管理: PM2
```

### 詳細なデプロイ指示

```
サーバー環境を設定し、以下の手順でデプロイを実行してください：

1. プロジェクトディレクトリに移動
   cd /home/zatint1991-hvt55/zatint1991.com

2. GitHubから最新コードを取得
   git fetch origin
   git reset --hard origin/main

3. 依存関係をインストール
   npm ci
   cd backend && npm ci && cd ..
   cd frontend && npm ci && cd ..

4. 環境変数を設定
   cp backend/env.production backend/.env

5. アプリケーションをビルド
   cd backend && npm run build && cd ..
   cd frontend && npm run build && cd ..

6. PM2プロセスを再起動
   pm2 restart all

7. ヘルスチェック
   curl http://localhost:8000/api/admin/backups/health

8. ログ確認
   pm2 logs --lines 20
```

## 🔧 環境別デプロイ指示

### 本番環境デプロイ

```
本番環境にデプロイしてください：

リポジトリ: https://github.com/itoshu008/kintai.git
ブランチ: main
サーバーパス: /home/zatint1991-hvt55/zatint1991.com
ポート: 8000
環境: production

実行コマンド：
./deploy-ploi.sh
```

### 開発環境デプロイ

```
開発環境にデプロイしてください：

リポジトリ: https://github.com/itoshu008/kintai.git
ブランチ: main
ローカルパス: E:\プログラム\kintai\kintai-clone
ポート: 8000
環境: development

実行コマンド：
npm run dev
```

## 🚨 トラブルシューティング指示

### エラーが発生した場合

```
デプロイ中にエラーが発生しました。以下を確認してください：

1. ログを確認
   pm2 logs --lines 50

2. プロセス状態を確認
   pm2 status

3. ポート使用状況を確認
   netstat -tlnp | grep 8000

4. ディスク容量を確認
   df -h

5. 権限を確認
   ls -la /home/zatint1991-hvt55/zatint1991.com

エラーの詳細を教えてください。
```

### ロールバック指示

```
前のバージョンにロールバックしてください：

1. バックアップディレクトリを確認
   ls -la /home/zatint1991-hvt55/backups/

2. 最新のバックアップを復元
   cp -r /home/zatint1991-hvt55/backups/backup_YYYYMMDD_HHMMSS/* /home/zatint1991-hvt55/zatint1991.com/

3. PM2を再起動
   pm2 restart all

4. 動作確認
   curl http://localhost:8000/api/admin/backups/health
```

## 📊 デプロイ後の確認指示

```
デプロイが完了しました。以下を確認してください：

1. バックエンドの動作確認
   curl http://localhost:8000/api/admin/departments
   curl http://localhost:8000/api/admin/backups/health

2. フロントエンドの動作確認
   curl http://localhost:8001

3. ログの確認
   pm2 logs --lines 10

4. プロセス状態の確認
   pm2 status

5. エラーログの確認
   tail -f /var/log/nginx/error.log

結果を教えてください。
```

## 🔄 継続的デプロイ設定

### GitHub Actions用指示

```
GitHub Actionsで自動デプロイを設定してください：

1. .github/workflows/deploy.yml を作成
2. mainブランチへのプッシュ時に自動デプロイ
3. サーバーへのSSH接続設定
4. デプロイスクリプトの実行
5. ヘルスチェックの実行

設定内容を教えてください。
```

### Webhook用指示

```
GitHub Webhookで自動デプロイを設定してください：

1. サーバーにWebhookエンドポイントを作成
2. GitHubリポジトリにWebhookを設定
3. プッシュ時に自動でデプロイスクリプトを実行
4. デプロイ結果をSlackやメールで通知

設定手順を教えてください。
```

## 💡 カスタマイズ指示

### 特定の機能のみデプロイ

```
バックアップ機能のみをデプロイしてください：

1. バックエンドのバックアップ関連ファイルのみを更新
2. フロントエンドのBackupManagerコンポーネントのみを更新
3. 他の機能は既存のまま維持
4. 部分的なビルドとデプロイを実行

実行してください。
```

### データベースマイグレーション

```
データベースのマイグレーションを実行してください：

1. 現在のデータをバックアップ
2. 新しいスキーマを適用
3. データの移行を実行
4. 動作確認を実行
5. 問題があればロールバック

実行してください。
```

---

## 🎯 使用方法

1. 上記の指示をCursorのチャットにコピー&ペースト
2. 必要に応じて環境設定を調整
3. Cursorが自動でデプロイを実行
4. 結果を確認して必要に応じて修正

**これでCursorを使った効率的なGitHubデプロイが可能になります！** 🚀
