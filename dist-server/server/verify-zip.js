import { BlockBlobClient } from '@azure/storage-blob';
import fetch from 'node-fetch';
import crypto from 'crypto';
async function verifyZipFlow() {
    const transferId = crypto.randomUUID();
    const testFiles = [
        { name: 'zip-test-1.txt', content: 'Content of zip test file 1' },
        { name: 'zip-test-2.txt', content: 'Content of zip test file 2' }
    ];
    console.log(`🚀 Starting Zip Verification (ID: ${transferId})...`);
    try {
        // 1. Upload files
        for (const file of testFiles) {
            const blobName = `${transferId}/${file.name}`;
            const writeSasResponse = await fetch(`http://localhost:3000/api/sas?file=${encodeURIComponent(blobName)}&permissions=w`);
            if (!writeSasResponse.ok)
                throw new Error(`Failed to get Write SAS token`);
            const { sasTokenUrl } = await writeSasResponse.json();
            const blockBlobClient = new BlockBlobClient(sasTokenUrl);
            await blockBlobClient.upload(file.content, file.content.length);
        }
        console.log('✅ Files uploaded.');
        // 2. Request Zip
        console.log('\n2️⃣  Testing Zip API...');
        const zipUrl = `http://localhost:3000/api/transfer/${transferId}/zip`;
        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`Zip request failed: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        console.log(`Response Content-Type: ${contentType}`);
        if (contentType !== 'application/zip') {
            throw new Error(`Expected content-type application/zip, got ${contentType}`);
        }
        const buffer = await response.buffer();
        console.log(`Zip size: ${buffer.length} bytes`);
        if (buffer.length < 100) {
            throw new Error('Zip file seems too small');
        }
        console.log('✅ Zip download successful.');
    }
    catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}
verifyZipFlow();
