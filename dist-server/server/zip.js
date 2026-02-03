import path from 'path';
import archiver from 'archiver';
import { listFilesInTransfer, getBucket } from './storage.js';
export async function streamZip(transferId, password, res) {
    try {
        const files = await listFilesInTransfer(transferId, password);
        if (files.length === 0) {
            return res.status(404).json({ error: 'No files found for this transfer' });
        }
        // Determine zip filename
        let zipName = `transfer-${transferId}.zip`;
        if (files.length > 0) {
            const firstFile = files[0].name;
            const baseName = path.basename(firstFile, path.extname(firstFile));
            if (files.length === 1) {
                zipName = `${baseName}.zip`;
            }
            else {
                zipName = `${baseName} - Bulk Transfer.zip`;
            }
        }
        // Set headers for download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        // Good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            }
            else {
                throw err;
            }
        });
        // good practice to catch this error explicitly
        archive.on('error', function (err) {
            console.error('Archiver error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to generate zip' });
            }
            else {
                res.end();
            }
        });
        // pipe archive data to the response
        archive.pipe(res);
        const bucket = getBucket();
        // Fetch each file and append to archive
        for (const file of files) {
            // Reconstruct the full GCS path
            // file.name is the relative path "folder/subfolder/file.txt"
            const gcsPath = `${transferId}/${file.name}`;
            // Create a read stream from GCS
            const gcsStream = bucket.file(gcsPath).createReadStream();
            // Handle stream errors so they don't crash everything?
            gcsStream.on('error', (err) => {
                console.error(`Error streaming file ${file.name} from GCS:`, err);
            });
            archive.append(gcsStream, { name: file.name });
        }
        await archive.finalize();
    }
    catch (error) {
        console.error('Error streaming zip:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream zip' });
        }
    }
}
