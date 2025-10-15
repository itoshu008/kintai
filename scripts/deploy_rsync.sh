#!/usr/bin/env bash
set -Eeuo pipefail

# ===== 必須環境変数 =====
: "${BUILD_USER:?BUILD_USER is required}"
: "${VPS_HOST:?VPS_HOST is required}"
: "${BACKEND_DIR:?BACKEND_DIR is required}"
: "${FRONTEND_DIR:?FRONTEND_DIR is required}"

log() { printf "\n[%s] %s\n" "$(date '+%F %T')" "$*" >&2; }
trap 's=$?; log "ERROR (exit $s): line ${BASH_LINENO[*]} cmd: ${BASH_COMMAND:-}"; exit $s' ERR

# ===== rsyncオプション（固着しにくい/途中再開/見える化） =====
RSYNC_OPTS=(
  -a
  -O --no-perms --no-group --omit-dir-times
  --delete-after                     # 削除は最後に
  --partial --partial-dir=.rsync-partial
  --timeout=60                       # 無限待ち回避
  --info=progress2 --info=stats2     # 進捗＆統計
  --exclude=.git --exclude=node_modules
  --exclude=.public_build*/ --exclude=public-backup*/
  --exclude=dist-ultimate*/ --exclude=kintai*/
)

# 回線が遅いなら軽圧縮（rsync 3.2+ のみ）を有効化：
# RSYNC_OPTS+=(--compress --compress-choice=zstd --compress-level=1)

# SSH最適化（CPU軽め暗号＆圧縮オフ）
RSYNC_SSH="ssh -T -o Compression=no -o StrictHostKeyChecking=accept-new -c aes128-gcm@openssh.com"

# ===== 保護フィルタ（backendの data* や backups* を削除から守る） =====
RSYNC_PROTECTS=(
  "--filter=P data*/"
  "--filter=P data*/**"
  "--filter=P data.bak/"
  "--filter=P data.bak/**"
  "--filter=P backups*/"
  "--filter=P backups*/**"
)

# ===== DRY RUN =====
DRY_ARGS=()
if [[ "${DRY_RUN:-}" == "1" ]]; then
  DRY_ARGS=(-nvi) # -n:ドライラン, -v:詳細, -i:差分一覧
  log "DRY_RUN mode enabled"
fi

# ===== backend =====
log "Sync backend -> $BUILD_USER@$VPS_HOST:$BACKEND_DIR"
if ! rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
  "${RSYNC_OPTS[@]}" "${RSYNC_PROTECTS[@]}" \
  ./backend/ "$BUILD_USER@$VPS_HOST:$BACKEND_DIR/"; then
  log "Inline protects failed, trying filter-file fallback..."
  PF="$(mktemp)"
  cat > "$PF" <<'EOF'
P data*/
P data*/**
P data.bak/
P data.bak/**
P backups*/
P backups/**
EOF
  rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
    "${RSYNC_OPTS[@]}" --filter=". '"$PF"'" \
    ./backend/ "$BUILD_USER@$VPS_HOST:$BACKEND_DIR/"
  rm -f "$PF"
fi

# ===== frontend =====
log "Sync frontend -> $BUILD_USER@$VPS_HOST:$FRONTEND_DIR"
rsync -e "$RSYNC_SSH" "${DRY_ARGS[@]}" \
  "${RSYNC_OPTS[@]}" \
  ./frontend/ "$BUILD_USER@$VPS_HOST:$FRONTEND_DIR/"

log "rsync deploy finished successfully."