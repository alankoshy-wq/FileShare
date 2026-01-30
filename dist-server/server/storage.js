import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
// Setup local uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up one level from 'server' to root, then 'uploads'
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
export function getUploadsDir() {
    return UPLOADS_DIR;
}
export async function storeTransferMetadata(transferId, password) {
    const transferDir = path.join(UPLOADS_DIR, transferId);
    if (!fs.existsSync(transferDir)) {
        fs.mkdirSync(transferDir, { recursive: true });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Create metadata object
    const metadata = {
        passwordHash,
        createdAt: new Date().toISOString()
    };
    const metadataPath = path.join(transferDir, '.metadata.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}
export async function getTransferMetadata(transferId) {
    const metadataPath = path.join(UPLOADS_DIR, transferId, '.metadata.json');
    try {
        const content = await fs.promises.readFile(metadataPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return null; // No metadata
        }
        throw error;
    }
}
export async function listFilesInTransfer(transferId, password) {
    const transferDir = path.join(UPLOADS_DIR, transferId);
    if (!fs.existsSync(transferDir)) {
        // Return empty if dir doesn't exist? Or throw 404? 
        // Existing logic returned empty list or error. Let's return empty for now, or match behavior.
        return [];
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
    // Recursive function to get all files
    async function getFilesRecursively(dir, baseDir) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        let files = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);
            if (entry.isDirectory()) {
                const subFiles = await getFilesRecursively(fullPath, baseDir);
                files = files.concat(subFiles);
            }
            else if (entry.isFile()) {
                // Skip metadata file and hidden files
                if (entry.name === '.metadata.json' || entry.name.startsWith('.')) {
                    continue;
                }
                const stats = await fs.promises.stat(fullPath);
                // Construct URL with relative path
                // relativePath might contain backslashes on Windows, need to normalize to forward slashes for URL
                const normalizedPath = relativePath.split(path.sep).join('/');
                const url = `/api/download/${transferId}/${encodeURIComponent(normalizedPath)}`;
                files.push({
                    name: normalizedPath, // Use relative path as name for display (e.g. "folder/file.txt")
                    url: url,
                    size: stats.size,
                    contentType: 'application/octet-stream'
                });
            }
        }
        return files;
    }
    return await getFilesRecursively(transferDir, transferDir);
}
