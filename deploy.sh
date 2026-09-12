#!/usr/bin/env bash
# Deploy Leaffy (frontend + backend) to https://sumitnarang.com/plants
# Usage: ./deploy.sh
set -euo pipefail

SERVER=root@46.62.130.159
REMOTE=/var/www/plants

cd "$(dirname "$0")"

echo "→ Building frontend"
npm run build

echo "→ Uploading frontend (dist/)"
# Old hashed files in assets/ are kept (not --delete) so browsers still holding the previous
# index.html don't get a blank page; files older than 30 days are pruned below.
rsync -az --delete --no-owner --no-group --exclude /assets/ dist/ "$SERVER:$REMOTE/dist/"
rsync -az --no-owner --no-group dist/assets/ "$SERVER:$REMOTE/dist/assets/"

echo "→ Uploading backend (server/ + .env)"
rsync -az --delete --no-owner --no-group --exclude node_modules --exclude .DS_Store server/ "$SERVER:$REMOTE/server/"
rsync -az --no-owner --no-group .env "$SERVER:$REMOTE/.env"

echo "→ Installing backend dependencies + restarting"
ssh "$SERVER" bash -s <<'EOF'
set -euo pipefail
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
chmod 600 /var/www/plants/.env
find /var/www/plants/dist/assets -type f -mtime +30 -delete
cd /var/www/plants/server
npm ci --omit=dev --no-audit --no-fund
if pm2 describe plants >/dev/null 2>&1; then
  pm2 restart plants --update-env
else
  pm2 start index.js --name plants --cwd /var/www/plants/server
fi
pm2 save
EOF

echo "→ Health check"
for i in {1..10}; do
  if curl -fsS https://sumitnarang.com/plants-api/health >/dev/null; then
    echo "✓ Deployed — https://sumitnarang.com/plants"
    exit 0
  fi
  sleep 1
done
echo "✗ Health check failed — run: ssh $SERVER 'pm2 logs plants --lines 50'" >&2
exit 1
