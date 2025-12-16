import { StorageSharedKeyCredential, BlobSASPermissions, SASProtocol, generateBlobSASQueryParameters } from '@azure/storage-blob';
export async function generateSasToken(containerName, blobName, permissions) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not found in environment variables');
    }
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
        protocol: SASProtocol.HttpsAndHttp
    };
    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
}
