# 🤖 Cursor用GitHub Actions設定依頼文

## 📋 基本的なGitHub Actions設定依頼

### 1. 基本的なCI/CD設定

```
GitHub ActionsでCI/CDパイプラインを設定してください。

要件：
- リポジトリ: https://github.com/itoshu008/kintai.git
- ブランチ: main
- サーバー: zatint1991.com
- ポート: 8000

設定内容：
1. .github/workflows/deploy.yml を作成
2. mainブランチへのプッシュ時に自動デプロイ
3. Node.js 18を使用
4. バックエンドとフロントエンドをビルド
5. PM2でプロセス管理
6. ヘルスチェックを実行

必要なSecrets：
- SSH_PRIVATE_KEY: サーバーへのSSH接続用
- HOST: サーバーのIPアドレス
- USER: SSHユーザー名
- PORT: SSHポート（通常22）
- DEPLOY_PATH: デプロイ先パス

設定ファイルを作成してください。
```

### 2. 詳細なデプロイ設定

```
GitHub Actionsで本格的なデプロイパイプラインを設定してください。

構成：
- ステージング環境: staging.zatint1991.com
- プロダクション環境: zatint1991.com
- データベース: MySQL/MariaDB
- プロセス管理: PM2
- リバースプロキシ: Nginx

パイプライン：
1. コードチェック（ESLint, TypeScript）
2. テスト実行（Jest）
3. ビルド（Backend + Frontend）
4. ステージングデプロイ
5. プロダクションデプロイ（手動承認）
6. ヘルスチェック
7. 通知（Slack/Email）

環境変数管理：
- ステージング: .env.staging
- プロダクション: .env.production
- データベース接続情報
- API キーとシークレット

設定ファイルを作成してください。
```

## 🔧 ステージング・プロダクション分離設定

### 1. 環境分離の依頼

```
ステージングとプロダクション環境を分離したデプロイ設定を作成してください。

環境構成：
- ステージング: staging.zatint1991.com:8001
- プロダクション: zatint1991.com:8000
- データベース: 環境別に分離
- ログ: 環境別に分離

デプロイフロー：
1. 開発 → ステージング（自動）
2. ステージング → プロダクション（手動承認）
3. ロールバック機能
4. 環境別設定管理

設定ファイル：
- .github/workflows/staging.yml
- .github/workflows/production.yml
- docker-compose.staging.yml
- docker-compose.production.yml
- 環境別.envファイル

作成してください。
```

### 2. 環境変数管理の依頼

```
環境変数の管理を自動化してください。

要件：
- 環境別設定ファイル
- シークレット管理
- 設定の検証
- デプロイ時の自動適用

設定内容：
1. 環境別.envファイル作成
2. GitHub Secrets設定
3. 設定検証スクリプト
4. デプロイ時の環境変数注入
5. 設定変更の通知

ファイル構成：
- .env.staging
- .env.production
- .env.example
- scripts/validate-env.js
- .github/workflows/env-check.yml

作成してください。
```

## 🚀 高度なデプロイ設定

### 1. Blue-Green デプロイ

```
Blue-Green デプロイメントを設定してください。

要件：
- ゼロダウンタイムデプロイ
- 自動ヘルスチェック
- ロールバック機能
- トラフィック切り替え

設定内容：
1. 2つの環境（Blue/Green）を維持
2. デプロイ時の自動切り替え
3. ヘルスチェック失敗時の自動ロールバック
4. Nginx設定の動的更新
5. データベースマイグレーション管理

ファイル：
- .github/workflows/blue-green-deploy.yml
- scripts/blue-green-switch.sh
- nginx/blue-green.conf
- scripts/health-check.js

作成してください。
```

### 2. マイクロサービス対応

```
マイクロサービス対応のデプロイ設定を作成してください。

構成：
- API Gateway
- 認証サービス
- 勤怠管理サービス
- バックアップサービス
- 通知サービス

設定内容：
1. サービス別デプロイ
2. サービス間通信設定
3. ロードバランシング
4. サービスディスカバリ
5. 監視とログ収集

ファイル：
- docker-compose.yml
- .github/workflows/microservices-deploy.yml
- k8s/ (Kubernetes設定)
- monitoring/prometheus.yml
- monitoring/grafana.yml

作成してください。
```

## 🔐 セキュリティ設定

### 1. セキュリティ強化

```
デプロイのセキュリティを強化してください。

要件：
- SSH鍵管理
- 証明書管理
- アクセス制御
- 監査ログ

設定内容：
1. SSH鍵の自動ローテーション
2. SSL証明書の自動更新
3. アクセス権限管理
4. セキュリティスキャン
5. 脆弱性チェック

ファイル：
- .github/workflows/security-scan.yml
- scripts/rotate-ssh-keys.sh
- scripts/update-ssl.sh
- security/access-control.yml

作成してください。
```

## 📊 監視・通知設定

### 1. 監視設定

```
デプロイの監視と通知を設定してください。

要件：
- アプリケーション監視
- インフラ監視
- ログ監視
- アラート通知

設定内容：
1. Prometheus + Grafana設定
2. ログ収集（ELK Stack）
3. アラート設定
4. ダッシュボード作成
5. 通知設定（Slack, Email）

ファイル：
- monitoring/prometheus.yml
- monitoring/grafana/
- monitoring/alertmanager.yml
- .github/workflows/monitoring-setup.yml

作成してください。
```

## 🎯 具体的な依頼例

### 今すぐ使える依頼文

```
以下の要件でGitHub Actionsのデプロイ設定を作成してください：

【基本情報】
- リポジトリ: https://github.com/itoshu008/kintai.git
- サーバー: zatint1991.com
- ユーザー: zatint1991-hvt55
- デプロイ先: /home/zatint1991-hvt55/zatint1991.com

【技術スタック】
- Node.js 18
- Express (Backend)
- React + Vite (Frontend)
- PM2 (Process Manager)
- Nginx (Reverse Proxy)
- MySQL (Database)

【デプロイフロー】
1. コードチェック（ESLint, TypeScript）
2. テスト実行
3. ビルド（Backend + Frontend）
4. サーバーへのデプロイ
5. PM2再起動
6. ヘルスチェック
7. 通知送信

【必要なSecrets】
- SSH_PRIVATE_KEY
- HOST
- USER
- DEPLOY_PATH

設定ファイルを作成してください。
```

---

## 💡 使用方法

1. 上記の依頼文をCursorのチャットにコピー&ペースト
2. 必要に応じて要件を調整
3. Cursorが自動で設定ファイルを生成
4. 生成されたファイルを確認・調整
5. GitHubリポジトリにコミット

**これでCursorが自動でGitHub Actionsとデプロイ設定を作成します！** 🚀
