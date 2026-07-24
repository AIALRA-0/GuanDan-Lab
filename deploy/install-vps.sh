#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

RELEASE_DIR="${1:?release directory is required}"
APP_ROOT='/srv/aialra/apps/guandan'
STATE_DIR='/srv/aialra/state/guandan'
RUNTIME_DIR="$APP_ROOT/runtime"
CURRENT_LINK="$APP_ROOT/current"
UNIT_SOURCE="$RELEASE_DIR/deploy/aialra-guandan.service"
UNIT_TARGET='/etc/systemd/system/aialra-guandan.service'
BACKUP_ROOT='/srv/aialra/backups/guandan'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

for required in \
  "$RELEASE_DIR/dist/server/index.js" \
  "$RELEASE_DIR/dist/server/wrangler.json" \
  "$RELEASE_DIR/dist/client" \
  "$RELEASE_DIR/deploy/runtime/package.json" \
  "$RELEASE_DIR/deploy/runtime/package-lock.json" \
  "$UNIT_SOURCE"; do
  [[ -e "$required" ]]
done

if ss -lntH 'sport = :13100' | grep -q . && ! systemctl is-active --quiet aialra-guandan.service; then
  printf 'Port 13100 is already occupied by another service\n' >&2
  exit 1
fi

if ! id -u aialra-guandan >/dev/null 2>&1; then
  useradd --system --home-dir "$STATE_DIR" --shell /usr/sbin/nologin --user-group aialra-guandan
fi

install -d -o root -g root -m 0755 "$APP_ROOT" "$APP_ROOT/releases"
install -d -o aialra-guandan -g aialra-guandan -m 0750 "$STATE_DIR"
install -d -o root -g root -m 0700 "$BACKUP_DIR"

previous_release=''
if [[ -L "$CURRENT_LINK" ]]; then
  previous_release="$(readlink -f "$CURRENT_LINK")"
  printf '%s\n' "$previous_release" > "$BACKUP_DIR/previous-release.txt"
fi
if [[ -f "$UNIT_TARGET" ]]; then
  cp -a "$UNIT_TARGET" "$BACKUP_DIR/aialra-guandan.service.before"
fi

rollback() {
  local failure_status="$?"
  trap - ERR
  set +e
  if [[ -n "$previous_release" && -d "$previous_release" ]]; then
    ln -sfn "$previous_release" "$CURRENT_LINK"
    systemctl restart aialra-guandan.service
  else
    systemctl disable --now aialra-guandan.service
    unlink "$CURRENT_LINK" 2>/dev/null || true
  fi
  if [[ -f "$BACKUP_DIR/aialra-guandan.service.before" ]]; then
    cp -a "$BACKUP_DIR/aialra-guandan.service.before" "$UNIT_TARGET"
    systemctl daemon-reload
  fi
  printf 'Guandan deployment failed and the previous service state was restored\n' >&2
  exit "$failure_status"
}
trap rollback ERR

if [[ ! -x "$RUNTIME_DIR/node_modules/.bin/wrangler" ]]; then
  runtime_stage="$(mktemp -d "$APP_ROOT/.runtime.XXXXXX")"
  install -o root -g root -m 0644 \
    "$RELEASE_DIR/deploy/runtime/package.json" \
    "$RELEASE_DIR/deploy/runtime/package-lock.json" \
    "$runtime_stage/"
  (
    cd "$runtime_stage"
    installed=0
    for registry in \
      https://registry.npmjs.org/ \
      https://registry.npmmirror.com/; do
      if npm ci \
        --omit=dev \
        --no-audit \
        --no-fund \
        --fetch-retries=5 \
        --fetch-retry-mintimeout=2000 \
        --fetch-retry-maxtimeout=20000 \
        --registry="$registry"; then
        installed=1
        break
      fi
    done
    [[ "$installed" == '1' ]]
  )
  [[ -x "$runtime_stage/node_modules/.bin/wrangler" ]]
  chown -R root:aialra-guandan "$runtime_stage"
  chmod -R g+rX,o-rwx "$runtime_stage"
  mv "$runtime_stage" "$RUNTIME_DIR"
fi

systemctl stop aialra-guandan.service 2>/dev/null || true
chown -R root:root "$RELEASE_DIR"
find "$RELEASE_DIR" -type d -exec chmod go-w {} +
find "$RELEASE_DIR" -type f -exec chmod go-w {} +
if [[ -d "$RELEASE_DIR/dist/server/.wrangler" && ! -L "$RELEASE_DIR/dist/server/.wrangler" ]]; then
  find "$RELEASE_DIR/dist/server/.wrangler" -type f -delete
  find "$RELEASE_DIR/dist/server/.wrangler" -depth -type d -empty -delete
fi
if [[ -L "$RELEASE_DIR/dist/server/.wrangler" ]]; then
  unlink "$RELEASE_DIR/dist/server/.wrangler"
fi
install -d -o aialra-guandan -g aialra-guandan -m 0750 \
  "$RELEASE_DIR/dist/server/.wrangler" \
  "$RELEASE_DIR/dist/server/.wrangler/tmp"
install -o root -g root -m 0644 "$UNIT_SOURCE" "$UNIT_TARGET"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

systemctl daemon-reload
systemctl enable --now aialra-guandan.service

for attempt in {1..120}; do
  if curl -fsS --max-time 4 \
    -H 'Host: guandan.aialra.online' \
    http://127.0.0.1:13100/ >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 120 ]]; then
    systemctl status --no-pager aialra-guandan.service >&2 || true
    journalctl -u aialra-guandan.service -n 100 --no-pager >&2 || true
    false
  fi
  sleep 1
done

api_result="$(curl -fsS --max-time 30 \
  -H 'Host: guandan.aialra.online' \
  -H 'Origin: https://guandan.aialra.online' \
  -H 'X-Aialra-Authenticated: 1' \
  -H 'X-Aialra-Sub: deployment-check' \
  -H 'X-Aialra-Email: deployment-check@local.invalid' \
  -H 'Content-Type: application/json' \
  --data-binary '{"kind":"training","module":"部署验证","score":100}' \
  http://127.0.0.1:13100/api/progress)"
jq -e '.trainingCompleted >= 1 and .rating >= 800' <<<"$api_result" >/dev/null

trap - ERR
printf 'release=%s\n' "$RELEASE_DIR"
printf 'backup=%s\n' "$BACKUP_DIR"
printf 'GUANDAN_SERVICE_OK\n'
