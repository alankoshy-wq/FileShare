import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } from '@azure/storage-blob';
import bcrypt from 'bcryptjs';
export async function storeTransferMetadata(transferId, password) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = 'uploads';
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not found in environment variables');
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Create metadata object
    const metadata = {
        passwordHash,
        createdAt: new Date().toISOString()
    };
    // Upload metadata as blob
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${transferId}/.metadata.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(JSON.stringify(metadata), JSON.stringify(metadata).length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
    });
}
export async function getTransferMetadata(transferId) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = 'uploads';
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not found in environment variables');
    }
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${transferId}/.metadata.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    try {
        const downloadResponse = await blockBlobClient.download();
        const downloaded = await streamToString(downloadResponse.readableStreamBody);
        return JSON.parse(downloaded);
    }
    catch (error) {
        if (error.statusCode === 404) {
            return null; // No metadata = no password protection
        }
        throw error;
    }
}
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
        readableStream.on('error', reject);
    });
}
export async function listFilesInTransfer(transferId, password) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = 'uploads'; // Assuming a fixed container for now
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not found in environment variables');
    }
    // Check if transfer is password protected
    const metadata = await getTransferMetadata(transferId);
    if (metadata) {
        // Transfer is password protected
        if (!password) {
            const error = new Error('Password required');
            error.statusCode = 401;
            throw error;
        }
        // Validate password
        const isValid = await bcrypt.compare(password, metadata.passwordHash);
        if (!isValid) {
            const error = new Error('Invalid password');
            error.statusCode = 401;
            throw error;
        }
    }
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const files = [];
    // List blobs with the transferId prefix
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${transferId}/` })) {
        // Skip metadata file
        if (blob.name.endsWith('.metadata.json')) {
            continue;
        }
        // Generate Read SAS Token for each file
        const sasOptions = {
            containerName,
            blobName: blob.name,
            permissions: BlobSASPermissions.parse("r"),
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 24 * 3600 * 1000), // 24 hours
            protocol: SASProtocol.HttpsAndHttp
        };
        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blob.name}?${sasToken}`;
        // Extract original filename from the blob path (transferId/filename)
        const name = blob.name.split('/').slice(1).join('/');
        files.push({
            name,
            url,
            size: blob.properties.contentLength,
            contentType: blob.properties.contentType
        });
    }
    return files;
}
