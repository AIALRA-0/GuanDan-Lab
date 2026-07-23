#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

RELEASE_DIR="${1:?release directory is required}"
HOSTNAME='guandan.aialra.online'
AVAILABLE='/srv/aialra/config/nginx/sites-available'
ENABLED='/srv/aialra/config/nginx/sites-enabled'
HTTP_SOURCE="$RELEASE_DIR/deploy/guandan.aialra.online.http.conf"
TARGET="$AVAILABLE/$HOSTNAME.conf"
LINK="$ENABLED/$HOSTNAME.conf"
SYSTEM_LINK="/etc/nginx/sites-enabled/$HOSTNAME.conf"
BACKUP_ROOT='/srv/aialra/backups/guandan'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP-hostname"

[[ -f "$HTTP_SOURCE" ]]
install -d -o root -g root -m 0700 "$BACKUP_DIR"
if [[ -e "$TARGET" ]]; then
  cp -a "$TARGET" "$BACKUP_DIR/nginx.conf.before"
fi

install -o root -g root -m 0644 "$HTTP_SOURCE" "$TARGET"
if [[ ! -e "$LINK" ]]; then
  ln -s "$TARGET" "$LINK"
fi
if [[ ! -e "$SYSTEM_LINK" && ! -L "$SYSTEM_LINK" ]]; then
  ln -s "$LINK" "$SYSTEM_LINK"
fi
[[ "$(readlink -f "$SYSTEM_LINK")" == "$(readlink -f "$TARGET")" ]]
nginx -t
systemctl reload nginx

if [[ ! -s "/etc/letsencrypt/live/$HOSTNAME/fullchain.pem" ]]; then
  certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare-aialra.ini \
    --dns-cloudflare-propagation-seconds 20 \
    --domain "$HOSTNAME" \
    --cert-name "$HOSTNAME" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email
fi

openssl x509 \
  -in "/etc/letsencrypt/live/$HOSTNAME/fullchain.pem" \
  -noout \
  -checkend 604800 >/dev/null

printf 'backup=%s\n' "$BACKUP_DIR"
printf 'GUANDAN_HOSTNAME_READY\n'
