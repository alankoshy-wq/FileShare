import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { createUser, getUser, deleteUser, getUserHistory, updateUserPassword } from './userStorage.js';
import { sendShareEmail, sendResetPasswordEmail } from './email.js';
import { deleteTransfer } from './storage.js';
import { logActivity, getAuditLogs } from './audit.js';
import { createSession, getSession, revokeSession, revokeAllUserSessions, revokeUserSessionsByDevice } from './session.js';
import { secrets } from './secrets.js';

const JWT_SECRET = secrets.JWT_SECRET;

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                name: string;
                role?: 'admin' | 'user';
            };
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err: any, decodedUser: any) => {
        if (err) return res.sendStatus(403);

        // 1. Check if token has a sessionId
        if (decodedUser.sessionId) {
            const session = await getSession(decodedUser.sessionId as string);
            if (!session) {
                // Session revoked or not found
                return res.status(401).json({ error: 'Session expired or revoked' });
            }
        }

        // Fetch fresh data from DB to ensure user exists and role is up-to-date
        try {
            const freshUser = await getUser(decodedUser.email);

            if (!freshUser) {
                // User account deleted or disabled
                return res.sendStatus(401);
            }

            req.user = {
                email: freshUser.email,
                name: freshUser.name,
                role: freshUser.role
            };
            next();
        } catch (error) {
            console.error("Error fetching fresh user in auth middleware", error);
            return res.sendStatus(500);
        }
    });
};

// Optional auth - allows guest but adds user info if token present
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (!err) {
                req.user = user;
            }
            next();
        });
    } else {
        next();
    }
};

export async function handleRegister(req: Request, res: Response) {
    try {
        let { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        email = email.toLowerCase().trim();

        const existingUser = await getUser(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await createUser(email, passwordHash, name);

        // Fetch user again to get the assigned role (e.g. if hardcoded admin)
        const newUser = await getUser(email);
        const role = newUser?.role || 'user';

        // Log Activity
        await logActivity(email, 'USER_REGISTER', { name }, undefined, req.ip);

        // Create Session for the new user
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.ip || 'Unknown';
        const sessionId = await createSession(email, userAgent, ip);

        // Generate token immediately (auto-login), including sessionId
        const token = jwt.sign({ email, name, role, sessionId }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: { email, name, role } });
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}

export async function handleLogin(req: Request, res: Response) {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        email = email.toLowerCase().trim();

        const user = await getUser(email);
        if (!user) {
            return res.status(401).json({ error: 'Account details not found, please sign up first' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Log Activity
        await logActivity(email, 'USER_LOGIN', {}, undefined, req.ip);

        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.ip || 'Unknown';

        // Smart Cleanup: Revoke any old sessions from this exact same device
        await revokeUserSessionsByDevice(email, userAgent, ip);

        // Create Session
        const sessionId = await createSession(email, userAgent, ip);

        const token = jwt.sign({
            email: user.email,
            name: user.name,
            role: user.role,
            sessionId // Include sessionId in token
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { email: user.email, name: user.name, role: user.role } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

export async function handleLogout(req: Request, res: Response) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded: any = jwt.decode(token);
            if (decoded && decoded.sessionId) {
                await revokeSession(decoded.sessionId);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
}

export async function handleDeleteAccount(req: Request, res: Response) {
    try {
        if (!req.user) return res.sendStatus(401);
        const { email } = req.user;

        // Log Activity before deletion
        await logActivity(email, 'USER_DELETE_ACCOUNT', {}, undefined, req.ip);

        // 1. Get all user transfers
        const transfers = await getUserHistory(email);

        // 2. Delete each transfer (files + metadata)
        await Promise.all(transfers.map(id => deleteTransfer(id).catch(e => console.error(`Failed to delete transfer ${id}`, e))));

        // 3. Revoke all active sessions
        await revokeAllUserSessions(email);

        // 4. Delete user record and history from Firestore
        await deleteUser(email);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
}

export async function handleGetAuditLogs(req: Request, res: Response) {
    try {
        if (!req.user) return res.sendStatus(401);

        /*
        if (req.user.role !== 'admin') {
            await logActivity(req.user.email, 'ADMIN_ACCESS_DENIED', { path: '/api/admin/logs' }, undefined, req.ip);
            return res.status(403).json({ error: 'Access denied' });
        }
        */

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const logs = await getAuditLogs(limit);

        res.json({ logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
}

export async function handleForgotPassword(req: Request, res: Response) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const user = await getUser(email);
        if (!user) {
            // Security: Don't reveal if user exists. Just simulate success or wait a bit.
            // For now, we'll just return success to avoid enumeration.
            return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        }

        // Generate short-lived reset token
        const resetToken = jwt.sign({ email: user.email, type: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

        // Construct reset link (Frontend URL)
        // Ideally this base URL should be configurable via env var
        const baseUrl = req.headers.origin || `http://localhost:5173`;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        await sendResetPasswordEmail(user.email, resetLink);

        await logActivity(user.email, 'PASSWORD_RESET_REQUEST', {}, undefined, req.ip);

        res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Request failed: ' + (error.message || error) });
    }
}

export async function handleResetPassword(req: Request, res: Response) {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

        jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
            if (err) return res.status(403).json({ error: 'Invalid or expired token' });

            if (decoded.type !== 'reset') {
                return res.status(403).json({ error: 'Invalid token type' });
            }

            const email = decoded.email;

            // Verify user still exists
            const user = await getUser(email);
            if (!user) return res.sendStatus(401);

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, 10);

            // Update DB
            await updateUserPassword(email, passwordHash);

            // Security: Revoke all existing sessions to force re-login
            await revokeAllUserSessions(email);

            await logActivity(email, 'PASSWORD_RESET_SUCCESS', {}, undefined, req.ip);

            res.json({ success: true, message: 'Password updated successfully' });
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Reset failed' });
    }
}
