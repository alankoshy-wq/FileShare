import fs from 'fs';
import path from 'path';
import os from 'os';

// 1. Setup environment BEFORE importing the app
const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (keyJson) {
    const tempFilePath = path.join(os.tmpdir(), 'sendshare-key.json');
    try {
        fs.writeFileSync(tempFilePath, keyJson);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath;
        console.log(`[Vercel] Credentials written to ${tempFilePath}`);
    } catch (err) {
        console.error('[Vercel] Failed to write credentials file:', err);
    }
} else {
    console.warn('[Vercel] GOOGLE_SERVICE_ACCOUNT_JSON is missing!');
}

// 2. Import the Express app from our server directory
// We use dynamic import to ensure the environment variables above are set
const { app } = await import('../server/index.js');

// 3. Export the app as the handler
export default app;
