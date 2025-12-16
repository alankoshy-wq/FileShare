import { BlockBlobClient } from '@azure/storage-blob';
import fetch from 'node-fetch';
async function verifyFlow() {
    const fileName = 'test-upload.txt';
    const fileContent = 'This is a test file uploaded via verification script.';
    const recipientEmail = 'test-recipient@example.com';
    console.log('🚀 Starting Full Flow Verification...');
    try {
        // 1. Get SAS Token
        console.log('\n1️⃣  Requesting SAS Token...');
        const sasResponse = await fetch(`http://localhost:3000/api/sas?file=${fileName}`);
        if (!sasResponse.ok)
            throw new Error(`Failed to get SAS token: ${sasResponse.statusText}`);
        const { sasTokenUrl } = await sasResponse.json();
        console.log('✅ SAS Token received.');
        // 2. Upload to Azure
        console.log('\n2️⃣  Uploading file to Azure...');
        const blockBlobClient = new BlockBlobClient(sasTokenUrl);
        await blockBlobClient.upload(fileContent, fileContent.length);
        console.log('✅ File uploaded successfully to Azure.');
        // 3. Trigger Email
        console.log('\n3️⃣  Triggering Email Notification...');
        const emailResponse = await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientEmail,
                fileName,
                shareLink: sasTokenUrl.split('?')[0], // Public URL
                message: 'This is a verification test.'
            })
        });
        if (!emailResponse.ok)
            throw new Error(`Failed to send email: ${emailResponse.statusText}`);
        const emailResult = await emailResponse.json();
        console.log('✅ Email trigger successful.');
        console.log('\n🎉 VERIFICATION COMPLETE!');
        console.log('Check the server logs above for the Ethereal Email Preview URL.');
    }
    catch (error) {
        console.error('\n❌ Verification Failed:', error);
    }
}
verifyFlow();
