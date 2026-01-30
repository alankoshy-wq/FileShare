
import { db } from './db.js';

const AUDIT_COLLECTION = 'audit_logs';

export interface AuditLog {
    userId?: string;
    email: string;
    action: string;
    details: any;
    ip?: string;
    timestamp: string;
}

export async function logActivity(
    email: string, 
    action: string, 
    details: any = {}, 
    userId?: string,
    ip?: string
) {
    try {
        const logEntry: AuditLog = {
            email,
            action,
            details,
            timestamp: new Date().toISOString()
        };

        if (userId) logEntry.userId = userId;
        if (ip) logEntry.ip = ip;

        await db.collection(AUDIT_COLLECTION).add(logEntry);
        console.log(`[Audit] ${action} by ${email}`);
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // We don't throw here to avoid failing the main user action just because logging failed
    }
}

export async function getAuditLogs(limit: number = 100) {
    try {
        const snapshot = await db.collection(AUDIT_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        throw error;
    }
}
