import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSasToken } from './sasToken.js';
import { sendShareEmail } from './email.js';
import { listFilesInTransfer, storeTransferMetadata } from './storage.js';
import { streamZip } from './zip.js';

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
}

app.get('/api/sas', async (req, res) => {
    try {
        const containerName = (req.query.container as string) || 'uploads';
        const fileName = req.query.file as string;
        const permissions = (req.query.permissions as string) || 'w'; // Default to write only

        if (!fileName) {
            return res.status(400).json({ error: 'File name is required' });
        }

        const sasTokenUrl = await generateSasToken(containerName, fileName, permissions);
        res.json({ sasTokenUrl });
    } catch (error) {
        console.error('Error generating SAS token:', error);
        res.status(500).json({ error: 'Failed to generate SAS token' });
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
        res.json({ files });
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
