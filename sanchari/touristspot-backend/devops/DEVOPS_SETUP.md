## GitHub Actions Deployment Setup

This repo includes:

- `.github/workflows/deploy-backend.yml`
- `devops/deploy-ec2.sh`
- `devops/ecosystem.config.cjs`

### One-time EC2 setup

On the EC2 server:

```bash
sudo apt update
sudo apt install -y curl build-essential git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

cd ~
git clone https://github.com/rishikesh-kosgi/touristspot-backend.git
cd touristspot-backend
cp .env.example .env
nano .env
npm install
pm2 start devops/ecosystem.config.cjs
pm2 save
```

### Required GitHub repository secrets

Add these in GitHub:

- `EC2_HOST`
  - your EC2 public IP or DNS
- `EC2_USER`
  - usually `ubuntu`
- `EC2_APP_DIR`
  - usually `/home/ubuntu/touristspot-backend`
- `EC2_SSH_PRIVATE_KEY`
  - contents of your `.pem` private key

### How deployment works

When you push to `master`, GitHub Actions will:

1. connect to EC2 over SSH
2. run `git pull`
3. run `npm install --omit=dev`
4. reload PM2
5. verify `http://127.0.0.1:5000/api/health`

### Important notes

- Keep `.env` only on EC2
- Make sure EC2 security group allows:
  - `22` from your IP for SSH
  - `5000` from the internet if you want direct backend access
- If you later add Nginx, your app can use port `80` or `443` instead of `5000`
