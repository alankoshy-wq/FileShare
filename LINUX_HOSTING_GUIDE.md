# Production Hosting Guide (Linux VPS)

This guide walks you through deploying the SendShare application to a Linux server (Ubuntu/Debian) and exposing it to the web with a domain name and SSL.

## Prerequisites

- A Linux VPS (e.g., Ubuntu 22.04 on DigitalOcean, AWS, Linode).
- A domain name pointing to your server's IP address (e.g., `share.yourdomain.com` -> `192.0.2.1`).
- SSH access to your server.

## 1. System Setup

Update your system and install essential tools.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx
```

### Install Node.js (via NVM)

We'll use NVM to install the latest LTS version of Node.js.

```bash
# Install specific nvm version (check latest on github)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Activate NVM (or restart terminal)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node LTS
nvm install --lts
nvm use --lts
```

### Install PM2

PM2 is a process manager to keep your app running.

```bash
npm install -g pm2
```

## 2. Application Setup

Clone your repository and set it up.

```bash
# Clone the repo
git clone https://github.com/alankoshy-wq/FileShare.git
cd FileShare

# Install dependencies
npm install
```

### Configuration

Create your `.env` file with production secrets.

```bash
cp .env.example .env
nano .env
```

**Essential `.env` adjustments for production:**
- `PORT=3000`
- `NODE_ENV=production`
- Fill in your Azure Storage and SMTP credentials.

### Build

Compile the frontend and backend.

```bash
npm run build
```

This generates `dist` (frontend) and `dist-server` (backend).

## 3. Run Application

Start the server using PM2.

```bash
pm2 start dist-server/server/index.js --name "fileshare"
pm2 save
```

**Ensure it starts on reboot:**
```bash
pm2 startup
# Run the command output by the above line (it varies by system)
pm2 save
```

Verify it's running:
```bash
curl http://localhost:3000
```

## 4. Expose to Web (Nginx)

Configure Nginx to proxy requests from the internet (port 80) to your Node app (port 3000).

Create a new Nginx config file:

```bash
sudo nano /etc/nginx/sites-available/fileshare
```

Paste the following (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name share.yourdomain.com; # <--- CHANGE THIS

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

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/fileshare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL Security (HTTPS)

Use Certbot to automatically set up a free SSL certificate.

```bash
sudo certbot --nginx -d share.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx config to force HTTPS.

## 6. Maintenance

- **Update App:**
  ```bash
  cd ~/FileShare
  git pull
  npm install
  npm run build
  pm2 restart fileshare
  ```

- **Logs:** `pm2 logs fileshare`
