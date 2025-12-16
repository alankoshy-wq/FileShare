# Manual Deployment Guide (Linux)

Follow these steps to deploy the SendShare application to a Linux server (e.g., Ubuntu).

## Step 1: Prerequisites (Non-Root/No Sudo)

Since you do not have `sudo` access, we will use **NVM (Node Version Manager)** to install Node.js in your user directory.

1.  **Install NVM**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    *Close and reopen your terminal* (or run `. ~/.nvm/nvm.sh`) to activate nvm.

2.  **Install Node.js**
    ```bash
    nvm install 18
    nvm use 18
    ```

3.  **Install PM2 (Process Manager)**
    With NVM, you can install global packages without sudo:
    ```bash
    npm install -g pm2
    ```

4.  **Verify Git**
    Check if git is installed:
    ```bash
    git --version
    ```
    *If git is missing, you will need to upload the project files manually (e.g., using SCP or FileZilla) instead of cloning.*

## Step 2: Setup Application

1.  **Clone the repository** (or copy your project files to the server).
    ```bash
    git clone <your-repo-url>
    cd SendShare
    ```

2.  **Install Production Dependencies**
    ```bash
    npm install
    ```
    *Note: This installs both dependencies and devDependencies (needed for build). If you want strict production size, you can prune later.*

## Step 3: Configuration

Create a `.env` file in the project root with your production secrets.

```bash
nano .env
```
Paste your environment variables:
```ini
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_KEY=your_storage_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
...
PORT=3000
NODE_ENV=production
```

## Step 4: Build

Build both the frontend (client) and backend (server).

```bash
npm run build
```
This will create:
- `dist/` (Client static files)
- `dist-server/` (Compiled server code)

## Step 5: Run with PM2

Start the application using PM2 to keep it running in the background.

```bash
pm2 start npm --name "sendshare" -- start
```
*Or directly running the start script:*
```bash
pm2 start dist-server/server/index.js --name "sendshare"
```

Save the process list:
```bash
pm2 save
```

**Persistence (Optional):**
Since you don't have sudo, `pm2 startup` might fail. You can try:
```bash
pm2 startup
```
If that asks for sudo, you can run a user-level cron job instead:
1. Run `crontab -e`
2. Add `@reboot /path/to/pm2 resurrect` (run `which pm2` to find the path).

## Maintenance

- **View Logs**: `pm2 logs sendshare`
- **Restart**: `pm2 restart sendshare`
- **Update**:
    ```bash
    git pull
    npm install
    npm run build
    pm2 restart sendshare
    ```
