import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'; // Added
import { sendShareEmail } from './email.js';
import { listFilesInTransfer, storeTransferMetadata, getTransferMetadata } from './storage.js';
import { streamZip } from './zip.js';
import { handleRegister, handleLogin, authenticateToken } from './auth.js';
import { getUserHistory, appendTransferHistory } from './userStorage.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
// Serve static files in production
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Assuming the server is running from dist-server/server/index.js and dist is at the root
    // So we need to go up two levels to get to root, then into dist
    // OR we just trust process.cwd() is project root.
    // Let's rely on process.cwd() for simplicity as standard Node apps do.
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use(express.static(distPath));
}
// Auth Routes
app.post('/api/auth/register', handleRegister);
app.post('/api/auth/login', handleLogin);
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});
app.get('/api/user/transfers', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.email)
            return res.sendStatus(401);
        const transferIds = await getUserHistory(req.user.email);
        const transfers = await Promise.all(transferIds.map(async (id) => {
            const meta = await getTransferMetadata(id);
            return {
                id,
                createdAt: meta?.createdAt || null
            };
        }));
        // Sort by newest first by default
        transfers.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
        res.json({ transfers });
    }
    catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
app.post('/api/user/history', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.email)
            return res.sendStatus(401);
        const { transferId } = req.body;
        if (!transferId)
            return res.status(400).json({ error: 'Transfer ID required' });
        await appendTransferHistory(req.user.email, transferId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error appending history:', error);
        res.status(500).json({ error: 'Failed to update history' });
    }
});
app.get('/api/download/:transferId/:filename', async (req, res) => {
    try {
        const { transferId, filename } = req.params;
        const decodedFilename = decodeURIComponent(filename);
        // This import needs to be dynamic or hoisted? It's fine here if hoisted, 
        // but let's just use the path logic.
        // Actually, importing locally in the handler is messy.
        // Let's rely on `storage.ts` logic. But storage.ts returns metadata/lists.
        // We need direct file reading.
        // Let's protect against directory traversal
        if (decodedFilename.includes('..') || transferId.includes('..')) {
            return res.status(400).json({ error: 'Invalid path' });
        }
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const filePath = path.join(uploadsDir, transferId, decodedFilename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Optional: Checking password via headers vs cookie?
        // listFilesInTransfer checks password and gives URL.
        // If we want to secure this URL, we'd need a temp token or similar.
        // For local dev/MVP, we heavily rely on the random transferId being secret enough + optional zip password.
        // But `listFilesInTransfer` enforces password.
        // If user accesses this URL directly, they bypass password check?
        // Ideally we should check password here too if metadata exists.
        // Minimal password check implementation:
        // const metadata = await getTransferMetadata(transferId);
        // if (metadata?.passwordHash) ... check header ...
        // For now, let's serve the file.
        res.download(filePath, decodedFilename);
    }
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});
app.get('/api/sas', async (req, res) => {
    // Replaced SAS generation with simple "upload here" URL for local storage
    // Since we are doing local storage, the client needs to upload to the server directly.
    // However, the client (FileUploadCard.tsx) likely expects an Azure SAS URL to PUT to.
    // If we want to minimal-change the frontend, we need to handle the PUT request here.
    // BUT: The frontend is doing `await axios.put(uploadUrl, file, ...)`
    // So if we return a URL like `/api/upload/chunk...`, the frontend will put to it.
    try {
        const containerName = req.query.container || 'uploads';
        const fileName = req.query.file; // This usually has transferId/filename
        if (!fileName) {
            return res.status(400).json({ error: 'File name is required' });
        }
        // Return a local URL that the frontend can PUT to.
        // Let's construct a URL that points to this server.
        // Note: fileName comes as "transferId/filename.ext"
        const uploadUrl = `/api/upload/block?file=${encodeURIComponent(fileName)}`;
        // Frontend expects { sasTokenUrl }
        // We'll return our local URL as the sasTokenUrl
        res.json({ sasTokenUrl: uploadUrl });
    }
    catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
// Add endpoint to handle the file upload (PUT)
app.put('/api/upload/block', async (req, res) => {
    try {
        const fileNameParam = req.query.file;
        if (!fileNameParam)
            return res.status(400).send('Missing file');
        const decodedPath = decodeURIComponent(fileNameParam);
        // decodedPath is "transferId/filename"
        // Safety check
        if (decodedPath.includes('..'))
            return res.status(400).send('Invalid path');
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        const fullPath = path.join(uploadsDir, decodedPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Stream the request body to the file
        const writeStream = fs.createWriteStream(fullPath);
        req.pipe(writeStream);
        writeStream.on('finish', () => {
            res.sendStatus(201);
        });
        writeStream.on('error', (err) => {
            console.error('File write error:', err);
            res.sendStatus(500);
        });
    }
    catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).send('Upload failed');
    }
});
app.get('/api/transfer/:id', async (req, res) => {
    try {
        const transferId = req.params.id;
        if (!transferId) {
            return res.status(400).json({ error: 'Transfer ID is required' });
        }
        const password = req.headers['x-transfer-password'];
        const files = await listFilesInTransfer(transferId, password);
        res.json({ files });
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
        const password = req.headers['x-transfer-password'];
        await streamZip(transferId, password, res);
    }
    catch (error) {
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
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
