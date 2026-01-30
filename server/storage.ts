import { Storage } from '@google-cloud/storage';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

import { db } from './db.js';
import { secrets } from './secrets.js';

const storage = new Storage();
const bucketName = secrets.GCS_BUCKET_NAME;

export function getBucket() {
    if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME environment variable is not set');
    }
    return storage.bucket(bucketName);
}

interface TransferMetadata {
    passwordHash?: string;
    createdAt: string;
    name?: string;
    sizeBytes?: number;
    fileCount?: number;
    creatorEmail?: string;
}

export async function storeTransferMetadata(transferId: string, password?: string, name?: string, sizeBytes?: number, fileCount?: number, creatorEmail?: string) {
    let passwordHash: string | undefined;
    if (password) {
        passwordHash = await bcrypt.hash(password, 10);
    }

    const docRef = db.collection('transfers').doc(transferId);

    // Check if doc exists to merge or set default createdAt
    const doc = await docRef.get();
    let metadata: TransferMetadata = doc.exists ? (doc.data() as TransferMetadata) : { createdAt: new Date().toISOString() };

    if (passwordHash) {
        metadata.passwordHash = passwordHash;
    }
    if (name) {
        metadata.name = name;
    }
    if (sizeBytes !== undefined) {
        metadata.sizeBytes = sizeBytes;
    }
    if (fileCount !== undefined) {
        metadata.fileCount = fileCount;
    }
    if (creatorEmail) {
        metadata.creatorEmail = creatorEmail;
    }

    await docRef.set(metadata, { merge: true });
}

export async function getTransferMetadata(transferId: string): Promise<TransferMetadata | null> {
    // 1. Try Firestore First
    const docRef = db.collection('transfers').doc(transferId);
    const doc = await docRef.get();

    if (doc.exists) {
        return doc.data() as TransferMetadata;
    }

    // 2. Fallback to GCS (Backward Compatibility)
    // If not in DB, check GCS. If found, we could migrate it on read, or just return it.
    console.log(`Metadata for ${transferId} not found in Firestore, checking GCS...`);
    const file = getBucket().file(`${transferId}/.metadata.json`);
    try {
        const [exists] = await file.exists();
        if (!exists) return null;

        const [content] = await file.download();
        const data = JSON.parse(content.toString()) as TransferMetadata;

        // Optional: Auto-migrate on read? 
        // Let's do it for seamless transition without running full script
        await docRef.set(data);
        console.log(`Migrated ${transferId} to Firestore on read.`);

        return data;
    } catch (error) {
        console.error('Error fetching metadata from GCS:', error);
        return null;
    }
}

export async function listFilesInTransfer(transferId: string, password?: string) {
    // Check if transfer is password protected
    const metadata = await getTransferMetadata(transferId);

    if (metadata && metadata.passwordHash) {
        if (!password) {
            const error: any = new Error('Password required');
            error.statusCode = 401;
            throw error;
        }

        const isValid = await bcrypt.compare(password, metadata.passwordHash);
        if (!isValid) {
            const error: any = new Error('Invalid password');
            error.statusCode = 401;
            throw error;
        }
    }

    const [files] = await getBucket().getFiles({ prefix: `${transferId}/` });

    // Filter out metadata and map to response format
    return files
        .filter(file => !file.name.endsWith('.metadata.json'))
        .map(file => {
            // file.name is "transferId/path/to/file"
            // we want relative path "path/to/file"
            const relativePath = file.name.slice(transferId.length + 1);

            // Construct download URL pointing to our server proxy
            // The proxy will then generate a signed URL
            const url = `/api/download/${transferId}/${encodeURIComponent(relativePath)}`;

            return {
                name: relativePath,
                url: url,
                size: parseInt(file.metadata.size as string || '0'),
                contentType: file.metadata.contentType || 'application/octet-stream'
            };
        });
}

export async function deleteTransfer(transferId: string) {
    const bucket = getBucket();
    // Delete all files including metadata with the prefix
    await bucket.deleteFiles({ prefix: `${transferId}/` });

    // Delete from Firestore
    await db.collection('transfers').doc(transferId).delete();
}
