#!/usr/bin/env bash
set -Eeuo pipefail

# ====== 必須環境変数チェック ======
: "${BUILD_USER:?BUILD_USER is required}"
: "${VPS_HOST:?VPS_HOST is required}"
: "${BACKEND_DIR:?BACKEND_DIR is required}"
: "${FRONTEND_DIR:?FRONTEND_DIR is required}"

# ====== ログ関数 / トラップ ======
log() { printf "\n[%s] %s\n" "$(date '+%F %T')" "$*" >&2; }
trap 's=$?; log "ERROR (exit $s): line ${BASH_LINENO[*]} cmd: ${BASH_COMMAND:-}"; exit $s' ERR

# ====== オプション配列 ======
RSYNC_OPTS=(
  -az -O --no-perms --no-group --omit-dir-times --delete
  --exclude=.git --exclude=node_modules
  --exclude=.public_build*/ --exclude=public-backup*/
  --exclude=dist-ultimate*/ --exclude=kintai*/
)

# ★ 保護フィルタ（1要素=1引数）
RSYNC_PROTECTS=(
  "--filter=P data*/"
  "--filter=P data*/**"
  "--filter=P data.bak/"
  "--filter=P data.bak/**"
  "--filter=P backups*/"
  "--filter=P backups*/**"
)

RSYNC_SSH="ssh -o StrictHostKeyChecking=accept-new"

# ====== rsync存在/バージョン ======
if ! command -v rsync >/dev/null 2>&1; then
  log "rsync not found"; exit 127
fi
log "rsync version: $(rsync --version | head -n1)"

# ====== DRY RUN（検証用） ======
DRY_ARGS=()
if [[ "${DRY_RUN:-}" == "1" ]]; then
  DRY_ARGS=(-nvi) # -n:ドライラン, -v:詳細, -i:差分表示
  log "DRY_RUN mode enabled"
fi

# ====== backend 同期（保護適用） ======
log "Sync backend -> $BUILD_USER@$VPS_HOST:$BACKEND_DIR"
if ! rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
  "${RSYNC_OPTS[@]}" "${RSYNC_PROTECTS[@]}" \
  ./backend/ "$BUILD_USER@$VPS_HOST:$BACKEND_DIR/"; then
  log "backend rsync failed with inline protects. Trying filter-file fallback..."

  # ---- フォールバック：フィルタファイル方式 ----
  PROTECT_FILE="$(mktemp)"
  cat > "$PROTECT_FILE" <<'EOF'
P data*/
P data*/**
P data.bak/
P data.bak/**
P backups*/
P backups/**
EOF

  rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
    "${RSYNC_OPTS[@]}" --filter=". '"$PROTECT_FILE"'" \
    ./backend/ "$BUILD_USER@$VPS_HOST:$BACKEND_DIR/"
  rm -f "$PROTECT_FILE"
fi

# ====== frontend 同期（保護不要） ======
log "Sync frontend -> $BUILD_USER@$VPS_HOST:$FRONTEND_DIR"
rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
  "${RSYNC_OPTS[@]}" \
  ./frontend/ "$BUILD_USER@$VPS_HOST:$FRONTEND_DIR/"

log "rsync deploy finished successfully."