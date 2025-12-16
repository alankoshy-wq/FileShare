import { generateSasToken } from './sasToken.js';
import { BlockBlobClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

async function testParallelUpload() {
    const files = [
        { name: `test-parallel-1-${Date.now()}.txt`, content: "File 1 Content" },
        { name: `test-parallel-2-${Date.now()}.txt`, content: "File 2 Content" }
    ];

    console.log(`Starting parallel upload of ${files.length} files...`);

    try {
        const uploadPromises = files.map(async (file) => {
            console.log(`[${file.name}] Requesting SAS...`);
            const sasUrl = await generateSasToken('uploads', file.name, 'w');

            console.log(`[${file.name}] Uploading to Blob Storage...`);
            const blockBlobClient = new BlockBlobClient(sasUrl);
            await blockBlobClient.uploadData(Buffer.from(file.content));

            console.log(`[${file.name}] Upload Complete.`);
            return sasUrl.split('?')[0];
        });

        const urls = await Promise.all(uploadPromises);
        console.log("All uploads finished.");
        console.log("URLs:", urls);

        // Verify existence (Optional, but good to check)
        // We can't easily check existence without a SAS token with 'r' permission or listing blobs, 
        // but if uploadData didn't throw, it should be there.

    } catch (e: any) {
        console.error("Parallel upload failed:", e);
    }
}

testParallelUpload();
