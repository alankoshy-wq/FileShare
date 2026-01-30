
import { db } from './db.js';
import { Request, Response } from 'express';
import { logActivity } from './audit.js';
import { deleteTransfer } from './storage.js';
import { getActiveSessionsCount, revokeAllUserSessions } from './session.js';
import { getBandwidthUsage } from './analytics.js';

export async function handleGetAdminMetrics(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const usersSnapshot = await db.collection('users').count().get();

        // Count transfers and sum storage size
        // Using .select('sizeBytes') fetched only the necessary field, much faster for large collections.
        const transfersSnapshot = await db.collection('transfers').select('sizeBytes').get();
        const totalTransfers = transfersSnapshot.size;

        const totalSize = transfersSnapshot.docs.reduce((acc, doc) => {
            const data = doc.data();
            return acc + (data.sizeBytes || 0);
        }, 0);

        // Helper to format bytes
        const formatBytes = (bytes: number) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const activeSessions = await getActiveSessionsCount();
        const bandwidthUsed = await getBandwidthUsage('all');

        res.json({
            metrics: {
                totalUsers: usersSnapshot.data().count,
                totalTransfers: totalTransfers,
                storageUsed: formatBytes(totalSize),
                activeSessions: activeSessions,
                bandwidthUsed: formatBytes(bandwidthUsed)
            }
        });
    } catch (error) {
        console.error('Error fetching admin metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
}

export async function handleGetAdminTransfers(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        // Simple pagination could be added with startAfter, but for now just limit

        const snapshot = await db.collection('transfers')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const transfers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ transfers });
    } catch (error) {
        console.error('Error fetching admin transfers:', error);
        res.status(500).json({ error: 'Failed to fetch transfers' });
    }
}

export async function handleDeleteTransferAdmin(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Transfer ID required' });

        await deleteTransfer(id);
        await logActivity(req.user.email, 'ADMIN_DELETE_TRANSFER', { transferId: id }, undefined, req.ip);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting transfer (admin):', error);
        res.status(500).json({ error: 'Failed to delete transfer' });
    }
}

export async function handleGetAdminUsers(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                email: doc.id,
                name: data.name,
                role: data.role || 'user',
                createdAt: data.createdAt
            };
        });

        res.json({ users });
    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}

import { deleteUser } from './userStorage.js';

export async function handleDeleteUserAdmin(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const { email } = req.params;
        if (!email) return res.status(400).json({ error: 'Email required' });

        if (email === req.user.email) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await revokeAllUserSessions(email);
        await deleteUser(email);
        await logActivity(req.user.email, 'ADMIN_DELETE_USER', { targetUser: email }, undefined, req.ip);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user (admin):', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}

import { getSession, revokeSession } from './session.js';

export async function handleGetAdminSessions(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const now = new Date().toISOString();
        const snapshot = await db.collection('sessions')
            .where('expiresAt', '>', now)
            .orderBy('expiresAt', 'desc') // Closest to expire first, or created? Let's sort by createdAt if possible, but Firestore limitations...
            // Actually, we can just sort in memory if the list is small (limit 50-100)
            .limit(100)
            .get();

        const sessions = snapshot.docs.map(doc => ({
            ...doc.data()
        }));

        // Sort by most recently active/created
        sessions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching admin sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
}

export async function handleRevokeSessionAdmin(req: Request, res: Response) {
    try {
        if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Session ID required' });

        await revokeSession(id);
        await logActivity(req.user.email, 'ADMIN_REVOKE_SESSION', { sessionId: id }, undefined, req.ip);

        res.json({ success: true });
    } catch (error) {
        console.error('Error revoking session (admin):', error);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
}
