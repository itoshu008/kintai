# 🔐 GitHub Secrets 設定ガイド（最終版）

## ⚠️ 重要：デプロイにはこれらのSecretsが**必須**です

現在、以下のエラーが発生しています：
- `SUDO_PASS: SUDO_PASS is not set` - SUDO_PASSが設定されていません

## 📋 設定が必要なSecrets（5個）

### 設定場所
1. GitHubリポジトリにアクセス: https://github.com/itoshu008/kintai
2. `Settings` → `Secrets and variables` → `Actions` をクリック
3. `New repository secret` をクリック
4. 以下の各Secretを1つずつ追加

### 必須のSecrets

| Secret名 | 入れる値 | 説明 |
|---------|---------|------|
| **VPS_HOST** | `202.233.67.137` | VPSのIPアドレス |
| **VPS_USER** | `itoshu` | SSH接続ユーザー名 |
| **VPS_PORT** | `10022` | SSHポート番号 |
| **VPS_SSH_KEY** | `C:\Users\itosh\Downloads\itoshu.pem`の中身 | SSH秘密鍵（全文） |
| **SUDO_PASS** | （sudoパスワード） | Linuxユーザーitoshuのsudoパスワード |

## 🔑 VPS_SSH_KEY の設定方法（重要！）

### ステップ1: pemファイルを開く
```
C:\Users\itosh\Downloads\itoshu.pem
```

### ステップ2: 全内容をコピー
- `-----BEGIN RSA PRIVATE KEY-----`
- （中身の長い文字列）
- `-----END RSA PRIVATE KEY-----`

**すべて**をコピーしてください（BEGIN/END含む）

### ステップ3: GitHub Secretsに貼り付け
- Name: `VPS_SSH_KEY`
- Value: （コピーした全内容）

## 🔒 SUDO_PASS の設定方法

### パスワードの確認
VPSにSSH接続して、以下のコマンドで確認できます：
```bash
# sudoコマンドを実行してパスワードを確認
sudo whoami
```

入力したパスワードを GitHub Secrets の `SUDO_PASS` に設定してください。

## ✅ 設定確認

すべてのSecretsを設定したら：
1. GitHub Actions → Deploy to VPS (SSH) を開く
2. 最新の実行ログを確認
3. "Preflight - Check secrets" ステップで以下のように表示されればOK：
   ```
   VPS_HOST: SET
   VPS_USER: SET
   VPS_SSH_KEY: SET
   VPS_PORT: SET
   SUDO_PASS: SET
   ```

## 🚀 デプロイ実行

Secretsを設定したら：
1. 任意の変更をコミット＆プッシュ
2. GitHub Actionsが自動実行されます
3. ログで `✅ deploy done` を確認

## ❌ よくあるエラー

### `SUDO_PASS: SUDO_PASS is not set`
→ `SUDO_PASS` Secretが設定されていません

### `ssh: no key found`
→ `VPS_SSH_KEY` が正しく設定されていません（全内容をコピーしてください）

### `ssh: unable to authenticate`
→ pemファイルの公開鍵がサーバーに登録されていません

## 📞 サポート

設定に問題がある場合は、GitHub Actionsのログを確認してください。

