## EC2 Deploy

### 1. Launch EC2

- Ubuntu 24.04 or 22.04
- Open inbound security-group rules:
  - `22` from your IP only
  - `5000` from `0.0.0.0/0` for direct backend testing

### 2. SSH into the server

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3. Install Node.js and build tools

```bash
sudo apt update
sudo apt install -y curl build-essential unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 4. Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 5. Clone the backend

```bash
git clone https://github.com/rishikesh-kosgi/touristspot-backend.git
cd touristspot-backend
```

### 6. Add environment variables

```bash
cp .env.example .env
nano .env
```

Recommended production values:

- `JWT_SECRET`: long random string
- `HOST=0.0.0.0`
- `PORT=5000`

### 7. Install dependencies

```bash
npm install
```

### 8. Start the backend

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 9. Verify the backend

```bash
curl http://127.0.0.1:5000/api/health
curl http://YOUR_EC2_PUBLIC_IP:5000/api/health
```

### 10. Point the app to EC2

Update your GitHub JSON repo `https://github.com/rishikesh-kosgi/apiurl` so `baseurl.json` contains:

```json
{
  "base_url": "http://YOUR_EC2_PUBLIC_IP:5000"
}
```

Restart the app on phones so it refreshes the backend URL.

### Notes

- This backend stores SQLite DB and uploaded images on the EC2 instance itself.
- If you stop/replace the EC2 instance without copying those files, that data is lost.
- For long-term production, move DB and images to managed storage.
