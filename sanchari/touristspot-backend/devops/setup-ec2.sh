#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/touristspot-backend}"
APP_USER="${APP_USER:-ubuntu}"
NODE_MAJOR="${NODE_MAJOR:-22}"
DOMAIN="${DOMAIN:-api.yourdomain.com}"

echo "Updating apt packages"
sudo apt update

echo "Installing system packages"
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2"
  sudo npm install -g pm2
fi

echo "Preparing app directory ${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "App repository not present in ${APP_DIR}."
  echo "Clone your backend repo into ${APP_DIR} before running deploy."
fi

echo "Installing Nginx site"
sudo cp devops/nginx-touristspot.conf /etc/nginx/sites-available/touristspot-backend
sudo sed -i "s/api\\.yourdomain\\.com/${DOMAIN}/g" /etc/nginx/sites-available/touristspot-backend
sudo ln -sf /etc/nginx/sites-available/touristspot-backend /etc/nginx/sites-enabled/touristspot-backend
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "Enabling services"
sudo systemctl enable nginx
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" || true

echo "Setup complete"
echo "Next steps:"
echo "1. Copy devops/.env.production.example to ${APP_DIR}/.env and fill real values"
echo "2. Clone the backend repo into ${APP_DIR} if not already done"
echo "3. Run devops/deploy-ec2.sh with APP_DIR=${APP_DIR}"
echo "4. Run certbot for HTTPS:"
echo "   sudo certbot --nginx -d ${DOMAIN}"
