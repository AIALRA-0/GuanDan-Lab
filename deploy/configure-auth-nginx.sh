#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

RELEASE_DIR="${1:?release directory is required}"
HOSTNAME='guandan.aialra.online'
APP_SLUG='guandan'
APPS_FILE='/srv/aialra/apps/auth-gateway/apps.json'
RECONCILE_AUTH='/srv/aialra/apps/authentik/reconcile_authentik_callbacks.sh'
AVAILABLE='/srv/aialra/config/nginx/sites-available'
ENABLED='/srv/aialra/config/nginx/sites-enabled'
NGINX_SOURCE="$RELEASE_DIR/deploy/guandan.aialra.online.conf"
NGINX_TARGET="$AVAILABLE/$HOSTNAME.conf"
NGINX_LINK="$ENABLED/$HOSTNAME.conf"
SYSTEM_LINK="/etc/nginx/sites-enabled/$HOSTNAME.conf"
BACKUP_ROOT='/srv/aialra/backups/guandan'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP-auth-nginx"

for required in \
  "$APPS_FILE" \
  "$RECONCILE_AUTH" \
  "$NGINX_SOURCE" \
  "/etc/letsencrypt/live/$HOSTNAME/fullchain.pem"; do
  [[ -s "$required" ]]
done

install -d -o root -g root -m 0700 "$BACKUP_DIR"
cp -a "$APPS_FILE" "$BACKUP_DIR/apps.json.before"
if [[ -e "$NGINX_TARGET" ]]; then
  cp -a "$NGINX_TARGET" "$BACKUP_DIR/nginx.conf.before"
fi

rollback() {
  local failure_status="$?"
  trap - ERR
  set +e
  cp -a "$BACKUP_DIR/apps.json.before" "$APPS_FILE"
  "$RECONCILE_AUTH" >/dev/null 2>&1
  if [[ -f "$BACKUP_DIR/nginx.conf.before" ]]; then
    cp -a "$BACKUP_DIR/nginx.conf.before" "$NGINX_TARGET"
  fi
  systemctl restart aialra-auth-gateway.service
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  printf 'Authentik, gateway, and Nginx changes were rolled back\n' >&2
  exit "$failure_status"
}
trap rollback ERR

apps_temp="$(mktemp)"
jq --arg host "$HOSTNAME" --arg slug "$APP_SLUG" \
  '. + {($host): {slug:$slug,name:"贯策",style:"complex"}}' \
  "$APPS_FILE" > "$apps_temp"
node -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"))' "$apps_temp"
install -o root -g root -m 0644 "$apps_temp" "$APPS_FILE"
rm -f "$apps_temp"

"$RECONCILE_AUTH"

install -o root -g root -m 0644 "$NGINX_SOURCE" "$NGINX_TARGET"
if [[ ! -e "$NGINX_LINK" ]]; then
  ln -s "$NGINX_TARGET" "$NGINX_LINK"
fi
if [[ ! -e "$SYSTEM_LINK" && ! -L "$SYSTEM_LINK" ]]; then
  ln -s "$NGINX_LINK" "$SYSTEM_LINK"
fi
[[ "$(readlink -f "$SYSTEM_LINK")" == "$(readlink -f "$NGINX_TARGET")" ]]

systemctl restart aialra-auth-gateway.service
for attempt in {1..30}; do
  if curl -fsS \
    -H "X-Original-Host: $HOSTNAME" \
    http://127.0.0.1:13010/health >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    exit 1
  fi
  sleep 1
done

nginx -t
systemctl reload nginx

status="$(curl -skS \
  --resolve "$HOSTNAME:443:127.0.0.1" \
  -o /dev/null \
  -w '%{http_code}' \
  "https://$HOSTNAME/")"
if [[ "$status" != '302' ]]; then
  printf 'Protected entry returned unexpected HTTP %s\n' "$status" >&2
  exit 1
fi

trap - ERR
printf 'backup=%s\n' "$BACKUP_DIR"
printf 'GUANDAN_AUTH_NGINX_OK\n'
