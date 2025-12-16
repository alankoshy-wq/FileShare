import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

async function fixCors() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_KEY;

    if (!accountName || !accountKey) {
        console.error("Missing credentials");
        return;
    }

    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
    );

    console.log("Setting CORS rules...");

    try {
        await blobServiceClient.setProperties({
            cors: [
                {
                    allowedOrigins: '*', // Allow all for development
                    allowedMethods: "GET,PUT,OPTIONS,POST,DELETE",
                    allowedHeaders: "*",
                    exposedHeaders: "*",
                    maxAgeInSeconds: 86400
                }
            ]
        });
        console.log("CORS rules set successfully!");
    } catch (error: any) {
        console.error("Failed to set CORS rules:", error.message);
    }
}

fixCors();
