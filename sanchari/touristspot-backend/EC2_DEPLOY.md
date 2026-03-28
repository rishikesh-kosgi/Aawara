## EC2 Deploy

This backend is now set up for a production-style EC2 deployment with:

- Node.js 22
- PM2 process management
- Nginx reverse proxy
- PostgreSQL via `DATABASE_URL`
- easy future migration to `AWS RDS PostgreSQL`

### 1. Launch EC2

Recommended:

- Ubuntu `24.04` or `22.04`
- `t4g.small` or `t3.small` to start
- attach an Elastic IP if possible

Security-group inbound rules:

- `22` from your IP only
- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`

### 2. SSH into the instance

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3. Clone the backend repo

```bash
sudo mkdir -p /var/www
sudo chown -R ubuntu:ubuntu /var/www
cd /var/www
git clone YOUR_BACKEND_GIT_URL touristspot-backend
cd /var/www/touristspot-backend
```

### 4. Run first-time setup

```bash
chmod +x devops/setup-ec2.sh devops/deploy-ec2.sh
DOMAIN=api.yourdomain.com APP_DIR=/var/www/touristspot-backend ./devops/setup-ec2.sh
```

This installs:

- Node.js
- PM2
- Nginx
- Certbot

### 5. Create production env

```bash
cd /var/www/touristspot-backend
cp devops/.env.production.example .env
nano .env
```

Minimum values to change:

- `DATABASE_URL`
- `PGSSL_MODE`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `UPLOADS_BASE_URL`
- `GOOGLE_WEB_CLIENT_ID`

### 6. Deploy the app

```bash
cd /var/www/touristspot-backend
APP_DIR=/var/www/touristspot-backend BRANCH=main ./devops/deploy-ec2.sh
```

### 7. Point the domain

Create a DNS record:

- `api.yourdomain.com` -> your EC2 public IP

### 8. Enable HTTPS

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### 9. Verify

```bash
curl http://127.0.0.1:5000/api/health
curl https://api.yourdomain.com/api/health
pm2 status
sudo nginx -t
```

### 10. Future move to AWS RDS PostgreSQL

When users increase, migration is simple:

1. create `RDS PostgreSQL`
2. update `DATABASE_URL`
3. set `PGSSL_MODE=require`
4. redeploy with `./devops/deploy-ec2.sh`

Your app server can stay on EC2 while the database moves to RDS.
