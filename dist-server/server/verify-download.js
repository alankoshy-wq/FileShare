import { BlockBlobClient } from '@azure/storage-blob';
import fetch from 'node-fetch';
async function verifyDownloadFlow() {
    const testFiles = [
        { name: 'test-file-1.txt', content: 'Content of test file 1' },
        { name: 'test-file-2.txt', content: 'Content of test file 2' },
        { name: 'test-file-3.txt', content: 'Content of test file 3' }
    ];
    console.log('🚀 Starting Download Verification...');
    try {
        for (const file of testFiles) {
            console.log(`\nTesting file: ${file.name}`);
            // 1. Get Write SAS Token
            console.log('1️⃣  Requesting Write SAS Token...');
            const writeSasResponse = await fetch(`http://localhost:3000/api/sas?file=${file.name}&permissions=w`);
            if (!writeSasResponse.ok)
                throw new Error(`Failed to get Write SAS token: ${writeSasResponse.statusText}`);
            const { sasTokenUrl: writeSasUrl } = await writeSasResponse.json();
            console.log('✅ Write SAS Token received.');
            // 2. Upload to Azure
            console.log('2️⃣  Uploading file to Azure...');
            const blockBlobClient = new BlockBlobClient(writeSasUrl);
            await blockBlobClient.upload(file.content, file.content.length);
            console.log('✅ File uploaded successfully.');
            // 3. Get Read SAS Token (simulating download link generation)
            console.log('3️⃣  Requesting Read SAS Token...');
            const readSasResponse = await fetch(`http://localhost:3000/api/sas?file=${file.name}&permissions=r`);
            if (!readSasResponse.ok)
                throw new Error(`Failed to get Read SAS token: ${readSasResponse.statusText}`);
            const { sasTokenUrl: readSasUrl } = await readSasResponse.json();
            console.log('✅ Read SAS Token received.');
            // 4. Download and Verify
            console.log('4️⃣  Downloading and Verifying content...');
            const downloadResponse = await fetch(readSasUrl);
            if (!downloadResponse.ok)
                throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
            const downloadedContent = await downloadResponse.text();
            if (downloadedContent === file.content) {
                console.log(`✅ Content verified for ${file.name}`);
            }
            else {
                console.error(`❌ Content mismatch for ${file.name}`);
                console.error(`Expected: ${file.content}`);
                console.error(`Received: ${downloadedContent}`);
                throw new Error('Content verification failed');
            }
        }
        console.log('\n🎉 ALL FILES VERIFIED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}
verifyDownloadFlow();
