#!/usr/bin/env bash
set -euo pipefail

# One-file EC2 pipeline for the TouristSpot backend.
#
# Usage:
# 1. Copy this file to your EC2 instance.
# 2. Edit the CONFIG section below.
# 3. Run:
#      chmod +x ec2-pipeline.sh
#      ./ec2-pipeline.sh
#
# This script is safe to rerun. It handles:
# - system packages
# - Node.js 22
# - PM2
# - Nginx
# - optional local PostgreSQL
# - cloning/updating the repo
# - writing the backend .env
# - starting the backend with PM2
# - wiring Nginx to the backend
# - optional HTTPS with Certbot

#######################################
# CONFIG
#######################################

APP_USER="${APP_USER:-ubuntu}"
APP_DIR="${APP_DIR:-/var/www/touristspot-backend}"
SOURCE_DIR="${SOURCE_DIR:-/var/www/aawara-source}"
DOMAIN="${DOMAIN:-api.yourdomain.com}"
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/rishikesh-kosgi/Aawara.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_SUBDIR="${BACKEND_SUBDIR:-sanchari/touristspot-backend}"
NODE_MAJOR="${NODE_MAJOR:-22}"

# Set to "true" if PostgreSQL will run on the same EC2 instance for now.
USE_LOCAL_POSTGRES="${USE_LOCAL_POSTGRES:-true}"
DB_NAME="${DB_NAME:-touristspot}"
DB_USER="${DB_USER:-touristspot_app}"
DB_PASSWORD="${YouDidIt@6digit}"

# Set to "true" only after your DNS points to the EC2 public IP / Elastic IP.
ENABLE_CERTBOT="${ENABLE_CERTBOT:-false}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-5000}"
HOST="${HOST:-0.0.0.0}"
TRUST_PROXY="${TRUST_PROXY:-1}"
PGSSL_MODE="${PGSSL_MODE:-disable}"
JWT_SECRET="${YouDidIt@6digit}"
CORS_ORIGINS="${CORS_ORIGINS:-https://yourdomain.com,https://www.yourdomain.com}"
BODY_LIMIT="${BODY_LIMIT:-1mb}"
RATE_LIMIT_WINDOW_MS="${RATE_LIMIT_WINDOW_MS:-900000}"
RATE_LIMIT_MAX="${RATE_LIMIT_MAX:-300}"
AUTH_RATE_LIMIT_MAX="${AUTH_RATE_LIMIT_MAX:-30}"
UPLOAD_RATE_LIMIT_MAX="${UPLOAD_RATE_LIMIT_MAX:-20}"
UPLOADS_DIR="${UPLOADS_DIR:-uploads}"
UPLOADS_BASE_URL="${UPLOADS_BASE_URL:-https://${DOMAIN}/uploads}"
GOOGLE_WEB_CLIENT_ID="${GOOGLE_WEB_CLIENT_ID:-replace-with-your-production-google-web-client-id}"

#######################################
# Helpers
#######################################

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

ensure_ubuntu() {
  if ! command -v apt >/dev/null 2>&1; then
    log "This script currently supports Ubuntu/Debian-based EC2 instances only."
    exit 1
  fi
}

write_env_file() {
  local database_url
  if [ "${USE_LOCAL_POSTGRES}" = "true" ]; then
    database_url="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
  else
    database_url="${DATABASE_URL:-}"
  fi

  if [ -z "${database_url}" ]; then
    log "DATABASE_URL is required when USE_LOCAL_POSTGRES=false"
    exit 1
  fi

  cat > "${APP_DIR}/.env" <<EOF
NODE_ENV=${NODE_ENV}
PORT=${PORT}
HOST=${HOST}
TRUST_PROXY=${TRUST_PROXY}
DATABASE_URL=${database_url}
PGSSL_MODE=${PGSSL_MODE}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=${CORS_ORIGINS}
BODY_LIMIT=${BODY_LIMIT}
RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX=${RATE_LIMIT_MAX}
AUTH_RATE_LIMIT_MAX=${AUTH_RATE_LIMIT_MAX}
UPLOAD_RATE_LIMIT_MAX=${UPLOAD_RATE_LIMIT_MAX}
UPLOADS_DIR=${UPLOADS_DIR}
UPLOADS_BASE_URL=${UPLOADS_BASE_URL}
GOOGLE_WEB_CLIENT_ID=${GOOGLE_WEB_CLIENT_ID}
EOF
}

write_nginx_config() {
  sudo tee /etc/nginx/sites-available/touristspot-backend >/dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 20M;

    location /uploads/ {
        alias ${APP_DIR}/uploads/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  sudo ln -sf /etc/nginx/sites-available/touristspot-backend /etc/nginx/sites-enabled/touristspot-backend
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl enable nginx
  sudo systemctl reload nginx
}

setup_local_postgres() {
  log "Installing PostgreSQL"
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql

  log "Ensuring PostgreSQL user/database exist"
  sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
EOF

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  fi
}

deploy_backend() {
  log "Installing production Node dependencies"
  cd "${APP_DIR}"
  npm install --omit=dev
  mkdir -p uploads

  log "Starting backend with PM2"
  if pm2 describe touristspot-backend >/dev/null 2>&1; then
    pm2 reload ecosystem.config.js --update-env
  else
    pm2 start ecosystem.config.js
  fi
  pm2 save
  pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" || true
}

wait_for_health() {
  local url="http://127.0.0.1:${PORT}/api/health"
  log "Waiting for health endpoint ${url}"

  for _ in $(seq 1 20); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      log "Health check passed"
      return 0
    fi
    sleep 3
  done

  log "Health check failed"
  pm2 logs touristspot-backend --lines 80 --nostream || true
  exit 1
}

#######################################
# Pipeline
#######################################

ensure_ubuntu

log "Updating apt packages"
sudo apt update

log "Installing base system packages"
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx rsync

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  sudo npm install -g pm2
fi

require_command node
require_command npm
require_command git
require_command curl

if [ "${USE_LOCAL_POSTGRES}" = "true" ]; then
  setup_local_postgres
fi

log "Preparing directories"
sudo mkdir -p /var/www
sudo chown -R "${APP_USER}:${APP_USER}" /var/www
mkdir -p "${SOURCE_DIR}"

if [ -d "${SOURCE_DIR}/.git" ]; then
  log "Updating source repo"
  git -C "${SOURCE_DIR}" fetch origin "${GIT_BRANCH}"
  git -C "${SOURCE_DIR}" checkout "${GIT_BRANCH}"
  git -C "${SOURCE_DIR}" pull --ff-only origin "${GIT_BRANCH}"
else
  log "Cloning source repo"
  git clone --branch "${GIT_BRANCH}" "${GIT_REPO_URL}" "${SOURCE_DIR}"
fi

log "Syncing backend source into ${APP_DIR}"
mkdir -p "${APP_DIR}"
rsync -a --delete "${SOURCE_DIR}/${BACKEND_SUBDIR}/" "${APP_DIR}/"

log "Writing production env"
write_env_file

log "Configuring Nginx"
write_nginx_config

deploy_backend
wait_for_health

if [ "${ENABLE_CERTBOT}" = "true" ]; then
  if [ -z "${CERTBOT_EMAIL}" ]; then
    log "ENABLE_CERTBOT=true but CERTBOT_EMAIL is empty"
    exit 1
  fi
  log "Requesting HTTPS certificate for ${DOMAIN}"
  sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect
  sudo systemctl reload nginx
fi

log "Pipeline complete"
printf '\nSummary\n'
printf 'Backend dir: %s\n' "${APP_DIR}"
printf 'Health URL : http://127.0.0.1:%s/api/health\n' "${PORT}"
printf 'Public URL : https://%s/api/health\n' "${DOMAIN}"
printf 'PM2 app    : touristspot-backend\n'
printf '\nChecks\n'
printf '  pm2 status\n'
printf '  curl http://127.0.0.1:%s/api/health\n' "${PORT}"
printf '  sudo nginx -t\n'
