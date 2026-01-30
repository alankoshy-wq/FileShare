
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const SESSIONS_COLLECTION = 'sessions';

export interface Session {
    sessionId: string;
    email: string;
    userAgent: string;
    ip: string;
    createdAt: string;
    expiresAt: string;
}

export async function createSession(email: string, userAgent: string, ip: string): Promise<string> {
    const sessionId = uuidv4();
    const createdAt = new Date().toISOString();

    // Default expiration 7 days matching token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const session: Session = {
        sessionId,
        email,
        userAgent,
        ip,
        createdAt,
        expiresAt
    };

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).set(session);
    return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const doc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!doc.exists) return null;
    return doc.data() as Session;
}

export async function revokeSession(sessionId: string): Promise<void> {
    await db.collection(SESSIONS_COLLECTION).doc(sessionId).delete();
}

export async function revokeAllUserSessions(email: string): Promise<void> {
    const snapshot = await db.collection(SESSIONS_COLLECTION).where('email', '==', email).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function revokeUserSessionsByDevice(email: string, userAgent: string, ip: string): Promise<void> {
    // Only revoke if all match (same user, same browser, same IP)
    const snapshot = await db.collection(SESSIONS_COLLECTION)
        .where('email', '==', email)
        .where('userAgent', '==', userAgent)
        .where('ip', '==', ip)
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export async function getActiveSessionsCount(): Promise<number> {
    const now = new Date().toISOString();
    const snapshot = await db.collection(SESSIONS_COLLECTION)
        .where('expiresAt', '>', now)
        .count()
        .get();
    return snapshot.data().count;
}
