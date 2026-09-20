#!/usr/bin/env bash
# Push the site to the server. Run from the repo root.
#   ./deploy/deploy.sh root@<server-ip>
set -euo pipefail

TARGET="${1:?usage: ./deploy/deploy.sh user@host}"
REMOTE_DIR="/var/www/acetechlimited.net"

echo "Deploying to ${TARGET}:${REMOTE_DIR}"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'deploy' \
  --exclude 'serve.js' \
  --exclude 'README.md' \
  ./ "${TARGET}:${REMOTE_DIR}/"

ssh "${TARGET}" "chown -R www-data:www-data ${REMOTE_DIR} && nginx -t && systemctl reload nginx"
echo "Done."
