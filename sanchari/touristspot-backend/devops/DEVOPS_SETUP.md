## EC2 DevOps Files

This folder now contains the exact deployment assets for a production-style EC2 setup:

- `devops/.env.production.example`
- `devops/nginx-touristspot.conf`
- `devops/setup-ec2.sh`
- `devops/deploy-ec2.sh`

Recommended production layout:

- Node backend on EC2 behind `pm2`
- Nginx reverse proxy on ports `80` and `443`
- PostgreSQL connection via `DATABASE_URL`
- Easy future move from local/self-hosted Postgres to `AWS RDS PostgreSQL`

### First-time server setup

From the backend repo on the EC2 instance:

```bash
chmod +x devops/setup-ec2.sh devops/deploy-ec2.sh
DOMAIN=api.yourdomain.com APP_DIR=/var/www/touristspot-backend ./devops/setup-ec2.sh
```

### App configuration

Create your production env file on the server:

```bash
cd /var/www/touristspot-backend
cp devops/.env.production.example .env
nano .env
```

### Deploy or redeploy

```bash
cd /var/www/touristspot-backend
APP_DIR=/var/www/touristspot-backend BRANCH=main ./devops/deploy-ec2.sh
```

### HTTPS

After your domain points to EC2:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Security group

Allow:

- `22` from your IP only
- `80` from the internet
- `443` from the internet

Do not expose port `5000` publicly once Nginx is in front of the app.
