
import serverless from 'serverless-http';
import fs from 'fs';
import path from 'path';
import os from 'os';

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
    if (!cachedHandler) {
        // 1. Setup environment BEFORE importing the app
        const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        if (keyJson) {
            const tempFilePath = path.join(os.tmpdir(), 'sendshare-key.json');
            try {
                fs.writeFileSync(tempFilePath, keyJson);
                process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath;
                console.log(`[Netlify] Credentials written to ${tempFilePath}`);
            } catch (err) {
                console.error('[Netlify] Failed to write credentials file:', err);
            }
        } else {
            console.warn('[Netlify] GOOGLE_SERVICE_ACCOUNT_JSON is missing!');
        }

        // 2. Use dynamic import to ensure environment variables are set 
        // before the app (and its Firestore instances) are initialized.
        const { app } = await import('../../server/index.js');
        cachedHandler = serverless(app);
    }

    return cachedHandler(event, context);
};
