import { BlockBlobClient } from '@azure/storage-blob';
import fetch from 'node-fetch';
import crypto from 'crypto';
async function verifyTransferFlow() {
    const transferId = crypto.randomUUID();
    const testFiles = [
        { name: 'transfer-test-1.txt', content: 'Content of transfer test file 1' },
        { name: 'transfer-test-2.txt', content: 'Content of transfer test file 2' }
    ];
    console.log(`🚀 Starting Transfer Verification (ID: ${transferId})...`);
    try {
        // 1. Upload files with transfer ID prefix
        for (const file of testFiles) {
            console.log(`\nUploading file: ${file.name}`);
            const blobName = `${transferId}/${file.name}`;
            // Get Write SAS Token
            const writeSasResponse = await fetch(`http://localhost:3000/api/sas?file=${encodeURIComponent(blobName)}&permissions=w`);
            if (!writeSasResponse.ok)
                throw new Error(`Failed to get Write SAS token: ${writeSasResponse.statusText}`);
            const { sasTokenUrl: writeSasUrl } = await writeSasResponse.json();
            // Upload to Azure
            const blockBlobClient = new BlockBlobClient(writeSasUrl);
            await blockBlobClient.upload(file.content, file.content.length);
            console.log('✅ File uploaded successfully.');
        }
        // 2. Verify Transfer API
        console.log('\n2️⃣  Testing Transfer API...');
        const transferResponse = await fetch(`http://localhost:3000/api/transfer/${transferId}`);
        if (!transferResponse.ok)
            throw new Error(`Failed to get transfer details: ${transferResponse.statusText}`);
        const { files } = await transferResponse.json();
        console.log(`✅ Transfer API returned ${files.length} files.`);
        if (files.length !== testFiles.length) {
            throw new Error(`Expected ${testFiles.length} files, got ${files.length}`);
        }
        // Verify file details
        for (const file of files) {
            console.log(`   - Found: ${file.name} (${file.size} bytes)`);
            if (!testFiles.find(tf => tf.name === file.name)) {
                throw new Error(`Unexpected file found: ${file.name}`);
            }
            if (!file.url) {
                throw new Error(`File ${file.name} is missing download URL`);
            }
        }
        console.log('\n🎉 TRANSFER VERIFICATION COMPLETE!');
    }
    catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}
verifyTransferFlow();
