import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';
import { Readable } from 'stream';
import { listFilesInTransfer } from './storage.js';

export async function streamZip(transferId: string, password: string | undefined, res: Response) {
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
            } else {
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
        archive.on('warning', function (err: any) {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                // throw error
                throw err;
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', function (err: any) {
            console.error('Archiver error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to generate zip' });
            } else {
                res.end();
            }
        });

        // pipe archive data to the response
        archive.pipe(res);

        // Fetch each file and append to archive
        for (const file of files) {
            const response = await fetch(file.url);
            if (!response.ok || !response.body) {
                console.warn(`Failed to fetch file ${file.name} for zip`);
                continue;
            }

            // Convert Web Stream to Node Readable Stream
            // @ts-ignore - Readable.fromWeb is available in Node 18+
            const nodeStream = Readable.fromWeb(response.body as any);
            archive.append(nodeStream, { name: file.name });
        }

        await archive.finalize();

    } catch (error) {
        console.error('Error streaming zip:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream zip' });
        }
    }
}
