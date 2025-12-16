import { generateSasToken } from './sasToken.js';
import { BlockBlobClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
dotenv.config();
async function test() {
    try {
        console.log("Generating SAS token...");
        const sasUrl = await generateSasToken('uploads', 'test-backend-upload.txt', 'w');
        console.log("SAS URL generated.");
        console.log("Uploading data...");
        const blockBlobClient = new BlockBlobClient(sasUrl);
        await blockBlobClient.uploadData(Buffer.from("Hello from backend test"));
        console.log("Upload successful!");
    }
    catch (e) {
        console.error("Upload failed:", e.message);
        if (e.details) {
            console.error("Details:", JSON.stringify(e.details, null, 2));
        }
    }
}
test();
