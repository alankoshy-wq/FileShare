import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const db = new Firestore();
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'sendshare-uploads';

async function migrate() {
    console.log('Starting migration...');
    const bucket = storage.bucket(bucketName);

    // List all files? No, list all prefixes?
    // GCS is flat, but we simulate folders like {transferId}/.metadata.json

    // We can list all files that end with .metadata.json
    const [files] = await bucket.getFiles({ matchGlob: '**/.metadata.json' });

    console.log(`Found ${files.length} metadata files to migrate.`);

    for (const file of files) {
        try {
            // file.name is "{transferId}/.metadata.json"
            const transferId = file.name.split('/')[0];

            if (!transferId || transferId.length < 5) {
                console.warn(`Skipping suspicious file: ${file.name}`);
                continue;
            }

            // Read content
            const [content] = await file.download();
            const data = JSON.parse(content.toString());

            // Write to Firestore
            // Use set with merge to be safe
            await db.collection('transfers').doc(transferId).set(data, { merge: true });
            console.log(`Migrated: ${transferId}`);

            // Optional: Rename/Delete after migration?
            // For safety, let's KEEP them for now. We can delete them later.
            // Or rename to .metadata.json.migrated
            // await file.rename(`${transferId}/.metadata.json.migrated`);

        } catch (err) {
            console.error(`Failed to migrate ${file.name}:`, err);
        }
    }

    console.log('Migration complete.');
}

migrate().catch(console.error);
