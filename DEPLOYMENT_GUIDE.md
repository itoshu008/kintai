# 🚀 デプロイガイド

## 📋 必須のGitHub Secrets設定

デプロイを実行するには、以下のSecretsを設定する必要があります。

### 設定手順

1. GitHubリポジトリにアクセス: https://github.com/itoshu008/kintai
2. `Settings` → `Secrets and variables` → `Actions`
3. `New repository secret` をクリック
4. 以下の各Secretを追加

### 必要なSecrets

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `SSH_HOST` | VPSのIPアドレスまたはドメイン | `zatint1991.com` または `202.233.67.137` |
| `SSH_USER` | SSH接続ユーザー名 | `zatint1991-hvt55` |
| `SSH_PRIVATE_KEY` | SSH秘密鍵の中身 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_PORT` | SSHポート番号 | `22` |
| `SUDO_PASS` | sudoパスワード | (実際のパスワード) |

## 🔐 SSH秘密鍵の取得方法

### 方法1: 既存の鍵を使用

```bash
# 秘密鍵の内容を表示
cat ~/.ssh/id_rsa
```

### 方法2: 新しい鍵を生成

```bash
# SSH鍵ペアを生成
ssh-keygen -t rsa -b 4096 -C "github-actions@zatint1991.com" -f ~/.ssh/kintai_deploy

# 公開鍵をサーバーに追加
ssh-copy-id -i ~/.ssh/kintai_deploy.pub zatint1991-hvt55@zatint1991.com

# 秘密鍵の内容を表示（これをGitHub Secretsに設定）
cat ~/.ssh/kintai_deploy
```

## ⚠️ 現在の状態

**Secretsが設定されていないため、デプロイは実行されません。**

以下のエラーが発生しています：
- `ssh: no key found` - SSH秘密鍵が無効
- `ssh: unable to authenticate` - 認証失敗

## ✅ デプロイ実行手順

1. **GitHub Secretsを設定**（上記参照）
2. **Secretsを確認**
   - GitHub Actions → 最新の実行 → Preflight - Check secrets
   - すべてのSecretsが`SET`になっていることを確認
3. **デプロイ実行**
   - `git push`するか、GitHub Actions → Run workflow

## 🔧 トラブルシューティング

### SSH接続テスト

```bash
# ローカルから接続テスト
ssh -p 22 zatint1991-hvt55@zatint1991.com

# 鍵を指定して接続テスト
ssh -i ~/.ssh/kintai_deploy -p 22 zatint1991-hvt55@zatint1991.com
```

### よくあるエラー

1. **`ssh: no key found`**
   - SSH_PRIVATE_KEYが正しく設定されていません
   - 秘密鍵の全内容（`-----BEGIN`から`-----END`まで）をコピーしてください

2. **`ssh: unable to authenticate`**
   - 公開鍵がサーバーに登録されていません
   - `ssh-copy-id`で公開鍵を追加してください

3. **`Permission denied`**
   - パスワードまたは鍵が間違っています
   - ユーザー名を確認してください

## 📞 サポート

問題が解決しない場合は、GitHub Actionsのログを確認してください。

