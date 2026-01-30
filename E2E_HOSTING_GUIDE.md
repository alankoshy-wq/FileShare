# Hosting SendShare on E2E Networks (Linux)

This guide specifically covers deploying to an **E2E Networks Cloud Compute** node running Ubuntu.

## 1. Provisioning the Node
1.  Log in to the [E2E Networks MyAccount](https://myaccount.e2enetworks.com/).
2.  Click **Create Node** and select **Cloud Compute (Linux)**.
3.  **OS Selection**: Choose **Ubuntu 22.04 LTS (Jammy Jellyfish)**.
4.  **Plan**: Select a plan with at least **1GB RAM** (c2.vCPU.1.RAM.1 or similar).
5.  **Security Group**: Ensure ports **22** (SSH), **80** (HTTP), and **443** (HTTPS) are open in the E2E panel.

## 2. Server Access & Prerequisites
Once the node is active, SSH into it:
```bash
ssh root@your_e2e_node_ip
```

### Update & Install Core Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx curl
```

### Install Node.js & PM2 (via NVM)
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node (LTS)
nvm install --lts
nvm use --lts

# Install PM2
npm install -g pm2
```

## 3. Application Deployment
Clone your code from GitHub:
```bash
git clone https://github.com/alankoshy-wq/FileShare.git
cd FileShare
npm install
```

### Configuration (.env)
Create your production `.env` and upload your Google Cloud credentials JSON.
```bash
nano .env
```
Ensure these are set:
- `PORT=3000`
- `NODE_ENV=production`
- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/sendshare-key.json`
- `JWT_SECRET=your_long_random_secret`
- `GCS_BUCKET_NAME=your_production_bucket`
- `SMTP_*` variables for email.

### Build & Run
```bash
npm run build
pm2 start dist-server/server/index.js --name "sendshare"
pm2 save
pm2 startup
```

## 4. Nginx Reverse Proxy
Configure Nginx to route traffic to your Node backend.
```bash
sudo nano /etc/nginx/sites-available/sendshare
```
Paste this configuration (replace `yourdomain.com` with yours):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/sendshare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL Security (HTTPS)
Install Certbot for free certificates:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## E2E Specific Tips:
- **Bandwidth**: E2E has specific egress costs; keep an eye on your usage panel if you have high-volume downloads.
- **Snapshots**: Use the "Snapshots" feature in the E2E panel before making major server-side changes.
- **Firewall**: In the E2E "Security Group" settings, verify that Incoming traffic on 80/443 is allowed.
