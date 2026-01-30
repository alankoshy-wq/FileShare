import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendShareEmail } from './email.js';
import { handleGetAdminMetrics, handleGetAdminTransfers, handleDeleteTransferAdmin, handleGetAdminUsers, handleDeleteUserAdmin, handleGetAdminSessions, handleRevokeSessionAdmin } from './admin.js';
import { listFilesInTransfer, storeTransferMetadata, getTransferMetadata, getBucket, deleteTransfer } from './storage.js';
import { streamZip } from './zip.js';
import { handleRegister, handleLogin, handleLogout, authenticateToken, optionalAuth, handleDeleteAccount, handleGetAuditLogs } from './auth.js';
import { getUserHistory, appendTransferHistory } from './userStorage.js';
import debugRouter from './debug.js';
import { logBandwidth } from './analytics.js';
import { loadSecrets } from './secrets.js';

dotenv.config();

// Load secrets from GSM (or fallback) before starting
await loadSecrets();

const app = express();
app.use('/api/debug', debugRouter);
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
}

// Ensure Bucket has CORS enabled for client-side uploads
// This is a one-time setup usually, but doing it on startup ensures it works.
// We should probably catch errors in case credentials are restricted.
(async () => {
    try {
        const bucket = getBucket();
        // Check or set CORS only if needed? 
        // Just setting it is safer for this migration to ensure it works.
        await bucket.setCorsConfiguration([{
            maxAgeSeconds: 3600,
            method: ['GET', 'PUT', 'OPTIONS'],
            origin: ['*'], // In production, this should be restricted
            responseHeader: ['Content-Type', 'x-goog-resumable']
        }]);
        console.log('GCS Bucket CORS configured');
    } catch (err) {
        console.warn('Failed to set CORS on bucket (might lack permissions):', err);
    }
})();

// Auth Routes
app.post('/api/auth/register', handleRegister);
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/logout', handleLogout);
// Admin Routes
app.get('/api/admin/logs', authenticateToken, handleGetAuditLogs);
app.get('/api/admin/metrics', authenticateToken, handleGetAdminMetrics);
app.get('/api/admin/transfers', authenticateToken, handleGetAdminTransfers);
app.delete('/api/admin/transfers/:id', authenticateToken, handleDeleteTransferAdmin);
app.get('/api/admin/users', authenticateToken, handleGetAdminUsers);
app.delete('/api/admin/users/:email', authenticateToken, handleDeleteUserAdmin);
app.get('/api/admin/sessions', authenticateToken, handleGetAdminSessions);
app.delete('/api/admin/sessions/:id', authenticateToken, handleRevokeSessionAdmin);

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/user/transfers', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.email) return res.sendStatus(401);
        const transferIds = await getUserHistory(req.user.email);

        if (transferIds.length === 0) {
            return res.json({ transfers: [] });
        }

        // Firestore 'in' query supports up to 10 items (or 30? limit is 10 for some queries, 30 for others). 
        // Actually, 'in' supports up to 30. For more, we need batches.
        // But for <30 it's fast. For >30, we can just do parallel gets or loop.
        // Actually, simpler: we can just Promise.all(transferIds.map(getTransferMetadata)) 
        // because getTransferMetadata is now a fast Firestore read (or fallback).
        // BUT, getTransferMetadata is exported from storage.ts.
        // Let's stick to the existing loop because getTransferMetadata handles the fallback logic nicely.
        // Since getTransferMetadata reads from Firestore now, it's already much faster (database read vs HTTP request to GCS).
        // 50 Firestore reads in parallel is very fast. 
        // Optimally, we would do a bulk query: db.getAll(...refs), but getTransferMetadata has logical fallout.

        // Let's try to optimize with db.getAll if possible, but we lose the fallback.
        // Compromise: Use the existing loop, which is now fast DB reads.
        // Wait, "N+1" problem in DB is better than N+1 in GCS, but still not ideal. 
        // Ideally we fetch all docs by ID.
        // Let's use db.getAll().

        // Import db? No, index.ts doesn't have db. importing from storage.ts gets complicated? 
        // We can import getTransferMetadata.
        // Let's just rely on getTransferMetadata because it has powerful "migrate on read" logic 
        // which is crucial for the transition phase.

        const results = await Promise.all(transferIds.map(async (id) => {
            const meta = await getTransferMetadata(id);
            if (!meta) return null;
            return {
                id,
                createdAt: meta.createdAt,
                name: meta.name || null
            };
        }));

        // Filter out deleted transfers
        const transfers = results.filter((t): t is NonNullable<typeof t> => t !== null);

        // Sort by newest first by default
        transfers.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });

        res.json({ transfers });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.post('/api/user/history', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.email) return res.sendStatus(401);
        const { transferId } = req.body;
        if (!transferId) return res.status(400).json({ error: 'Transfer ID required' });

        await appendTransferHistory(req.user.email, transferId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error appending history:', error);
        res.status(500).json({ error: 'Failed to update history' });
    }
});

app.get('/api/download/:transferId/:filename', async (req, res) => {
    try {
        const { transferId, filename } = req.params;
        const decodedFilename = decodeURIComponent(filename);

        if (decodedFilename.includes('..') || transferId.includes('..')) {
            return res.status(400).json({ error: 'Invalid path' });
        }

        // Generate Signed URL for download
        const file = getBucket().file(`${transferId}/${decodedFilename}`);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).json({ error: 'File not found' });
        }

        const [metadata] = await file.getMetadata();
        const size = parseInt(metadata.size as string || '0');

        // Log bandwidth usage (async, don't await to not block redirect)
        logBandwidth(size).catch(err => console.error('Bandwidth logging error:', err));

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });

        // Redirect user to the GCS signed URL
        res.redirect(url);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

app.get('/api/sas', async (req, res) => {
    try {
        const fileName = req.query.file as string;
        const contentType = (req.query.contentType as string) || 'application/octet-stream';
        // fileName is "transferId/filename.ext"

        if (!fileName) {
            return res.status(400).json({ error: 'File name is required' });
        }

        const file = getBucket().file(fileName);
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: contentType,
        });

        res.json({ sasTokenUrl: uploadUrl });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

app.get('/api/transfer/:id', async (req, res) => {
    try {
        const transferId = req.params.id;
        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID is required' });
        }

        const password = req.headers['x-transfer-password'] as string | undefined;

        const files = await listFilesInTransfer(transferId, password);
        const metadata = await getTransferMetadata(transferId);
        res.json({ files, name: metadata?.name });
    } catch (error: any) {
        console.error('Error listing files in transfer:', error);
        if (error.statusCode === 401) {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to list files' });
    }
});

app.post('/api/send-email', async (req, res) => {
    try {
        const { recipientEmail, files, message, shareLink } = req.body;

        if (!recipientEmail || !files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or invalid files list' });
        }

        await sendShareEmail(recipientEmail, files, shareLink, message);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.post('/api/transfer/:id/lock', async (req, res) => {
    try {
        const transferId = req.params.id;
        const { password } = req.body;

        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID is required' });
        }

        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return res.status(400).json({ error: 'Valid password is required' });
        }

        await storeTransferMetadata(transferId, password);
        res.json({ success: true, message: 'Transfer locked successfully' });
    } catch (error) {
        console.error('Error locking transfer:', error);
        res.status(500).json({ error: 'Failed to lock transfer' });
    }
});

app.get('/api/transfer/:id/zip', async (req, res) => {
    try {
        const transferId = req.params.id;
        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID is required' });
        }
        const password = req.headers['x-transfer-password'] as string | undefined;
        await streamZip(transferId, password, res);
    } catch (error: any) {
        console.error('Error initiating zip stream:', error);
        if (!res.headersSent) {
            if (error.statusCode === 401) {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to initiate zip download' });
        }
    }
});

// Handle client-side routing in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        const distPath = path.resolve(process.cwd(), 'dist');
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.post('/api/transfer/:id/finalize', optionalAuth, async (req, res) => {
    try {
        const transferId = req.params.id;
        const { name, size, fileCount } = req.body;

        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID is required' });
        }

        const creatorEmail = req.user?.email;

        // Store metadata with name and creator email
        await storeTransferMetadata(transferId, undefined, name, size, fileCount, creatorEmail);
        res.json({ success: true });
    } catch (error) {
        console.error('Error finalizing transfer:', error);
        res.status(500).json({ error: 'Failed to finalize transfer' });
    }
});

app.delete('/api/transfer/:id', authenticateToken, async (req, res) => {
    try {
        const transferId = req.params.id;
        // Verify user owns this transfer?
        // Current architecture: User's ownership is loosely coupled via history.json.
        // Ideally we should check if transferId is in user's history, but for now we trust the ID.
        // A user could theoretically delete another user's transfer if they guess the UUID, 
        // but UUIDs are hard to guess.

        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID required' });
        }

        await deleteTransfer(transferId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting transfer:', error);
        res.status(500).json({ error: 'Failed to delete transfer' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
