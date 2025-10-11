# 🤖 Cursor用完全デプロイ指示文

## 📋 基本的なデプロイ指示

### 1. GitHub Actions設定の依頼

```
GitHub ActionsでCI/CDパイプラインを設定してください。

要件：
- リポジトリ: https://github.com/itoshu008/kintai.git
- サーバー: zatint1991.com
- ユーザー: zatint1991-hvt55
- デプロイ先: /home/zatint1991-hvt55/zatint1991.com

設定内容：
1. .github/workflows/deploy.yml を作成
2. mainブランチへのプッシュ時にプロダクションデプロイ
3. stagingブランチへのプッシュ時にステージングデプロイ
4. Node.js 18を使用
5. バックエンドとフロントエンドをビルド
6. PM2でプロセス管理
7. ヘルスチェックを実行
8. 失敗時のロールバック機能

必要なSecrets：
- SSH_PRIVATE_KEY: サーバーへのSSH接続用
- SSH_HOST: zatint1991.com
- SSH_USER: zatint1991-hvt55
- DEPLOY_PATH: /home/zatint1991-hvt55/zatint1991.com
- STAGING_DEPLOY_PATH: /home/zatint1991-hvt55/staging.zatint1991.com
- BACKUP_PATH: /home/zatint1991-hvt55/backups

設定ファイルを作成してください。
```

### 2. 高度なデプロイ設定の依頼

```
Blue-Green デプロイメントを設定してください。

要件：
- ゼロダウンタイムデプロイ
- 自動ヘルスチェック
- ロールバック機能
- 環境別設定管理

設定内容：
1. .github/workflows/advanced-deploy.yml を作成
2. ステージング環境での事前テスト
3. プロダクション環境への段階的デプロイ
4. 自動バックアップ作成
5. ヘルスチェック失敗時の自動ロールバック
6. デプロイメント通知

ファイル構成：
- .github/workflows/deploy.yml (基本デプロイ)
- .github/workflows/advanced-deploy.yml (高度なデプロイ)
- .github/workflows/environments.yml (環境管理)
- GITHUB_SECRETS_SETUP.md (Secrets設定ガイド)

作成してください。
```

## 🔧 環境設定の依頼

### 1. 環境分離設定

```
ステージングとプロダクション環境を分離してください。

環境構成：
- ステージング: staging.zatint1991.com:8001
- プロダクション: zatint1991.com:8000
- データベース: 環境別に分離
- ログ: 環境別に分離

設定内容：
1. 環境別.envファイル作成
2. 環境別PM2設定
3. 環境別Nginx設定
4. 環境別データベース設定
5. 環境別バックアップ設定

ファイル：
- .env.staging
- .env.production
- ecosystem.staging.config.js
- ecosystem.production.config.js
- nginx/staging.conf
- nginx/production.conf

作成してください。
```

### 2. 環境変数管理

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

ファイル：
- .env.staging
- .env.production
- .env.example
- scripts/validate-env.js
- .github/workflows/env-check.yml

作成してください。
```

## 🚀 デプロイスクリプトの依頼

### 1. 自動デプロイスクリプト

```
サーバー用の自動デプロイスクリプトを作成してください。

要件：
- GitHubから最新コードを取得
- 依存関係をインストール
- アプリケーションをビルド
- PM2でプロセス再起動
- ヘルスチェック実行
- エラー時のロールバック

スクリプト：
- deploy-ploi.sh (本格版)
- deploy-simple.sh (簡易版)
- cursor-auto-deploy.sh (Cursor用)
- rollback.sh (ロールバック用)

作成してください。
```

### 2. 監視・通知設定

```
デプロイの監視と通知を設定してください。

要件：
- アプリケーション監視
- インフラ監視
- ログ監視
- アラート通知

設定内容：
1. ヘルスチェックエンドポイント
2. ログ監視設定
3. アラート通知設定
4. ダッシュボード作成
5. メトリクス収集

ファイル：
- monitoring/health-check.js
- monitoring/log-monitor.js
- monitoring/alert-config.yml
- .github/workflows/monitoring-setup.yml

作成してください。
```

## 🔐 セキュリティ設定の依頼

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

## 📊 完全なデプロイ設定の依頼

### 1. 統合デプロイ設定

```
完全なCI/CDパイプラインを構築してください。

構成：
- GitHub Actions (CI/CD)
- ステージング・プロダクション環境分離
- Blue-Green デプロイメント
- 自動バックアップ・ロールバック
- 監視・通知システム
- セキュリティ強化

設定内容：
1. 全ワークフローファイル
2. 環境設定ファイル
3. デプロイスクリプト
4. 監視設定
5. セキュリティ設定
6. ドキュメント

ファイル一覧：
- .github/workflows/
  - deploy.yml
  - advanced-deploy.yml
  - environments.yml
  - security-scan.yml
  - monitoring-setup.yml
- 環境設定ファイル
- デプロイスクリプト
- 監視設定
- セキュリティ設定
- ドキュメント

作成してください。
```

## 🎯 今すぐ使える指示文

### 完全なデプロイ設定を一括作成

```
以下の要件で完全なCI/CDパイプラインを構築してください：

【基本情報】
- リポジトリ: https://github.com/itoshu008/kintai.git
- サーバー: zatint1991.com
- ユーザー: zatint1991-hvt55
- プロダクション: /home/zatint1991-hvt55/zatint1991.com
- ステージング: /home/zatint1991-hvt55/staging.zatint1991.com

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
4. ステージングデプロイ（stagingブランチ）
5. プロダクションデプロイ（mainブランチ）
6. ヘルスチェック
7. 通知送信

【環境分離】
- ステージング: ポート8001
- プロダクション: ポート8000
- 環境別データベース
- 環境別設定ファイル

【必要なSecrets】
- SSH_PRIVATE_KEY
- SSH_HOST: zatint1991.com
- SSH_USER: zatint1991-hvt55
- DEPLOY_PATH: /home/zatint1991-hvt55/zatint1991.com
- STAGING_DEPLOY_PATH: /home/zatint1991-hvt55/staging.zatint1991.com
- BACKUP_PATH: /home/zatint1991-hvt55/backups

【作成するファイル】
- .github/workflows/deploy.yml
- .github/workflows/advanced-deploy.yml
- .github/workflows/environments.yml
- .env.staging
- .env.production
- deploy-ploi.sh
- deploy-simple.sh
- cursor-auto-deploy.sh
- GITHUB_SECRETS_SETUP.md
- CURSOR_DEPLOY_INSTRUCTIONS.md

完全な設定を作成してください。
```

---

## 💡 使用方法

1. 上記の指示文をCursorのチャットにコピー&ペースト
2. 必要に応じて要件を調整
3. Cursorが自動で設定ファイルを生成
4. 生成されたファイルを確認・調整
5. GitHubリポジトリにコミット
6. GitHub Secretsを設定
7. デプロイをテスト

**これでCursorが完全なCI/CDパイプラインを自動構築します！** 🚀
