#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/touristspot-backend}"
BRANCH="${BRANCH:-master}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"

echo "Deploying backend in ${APP_DIR} from branch ${BRANCH}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "App directory is missing or is not a git repo: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

echo "Fetching latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "Installing production dependencies"
npm install --omit=dev

echo "Starting or reloading PM2 app"
if pm2 describe touristspot-backend >/dev/null 2>&1; then
  pm2 reload devops/ecosystem.config.cjs --update-env
else
  pm2 start devops/ecosystem.config.cjs
fi

pm2 save

echo "Waiting for health check"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "${HEALTH_URL}" >/dev/null; then
    echo "Health check passed"
    exit 0
  fi
  sleep 3
done

echo "Health check failed: ${HEALTH_URL}" >&2
pm2 logs touristspot-backend --lines 80 --nostream || true
exit 1
