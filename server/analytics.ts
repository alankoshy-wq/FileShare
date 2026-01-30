import { db } from './db.js';
import { FieldValue } from '@google-cloud/firestore';

const ANALYTICS_COLLECTION = 'analytics';
const BANDWIDTH_DOC = 'bandwidth';
const DAILY_SUBCOLLECTION = 'daily';

/**
 * Logs bandwidth usage for a specific day.
 * @param bytes Number of bytes requested for download
 */
export async function logBandwidth(bytes: number) {
    if (bytes <= 0) return;

    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const docRef = db.collection(ANALYTICS_COLLECTION)
            .doc(BANDWIDTH_DOC)
            .collection(DAILY_SUBCOLLECTION)
            .doc(today);

        await docRef.set({
            totalBytes: FieldValue.increment(bytes),
            date: today
        }, { merge: true });

    } catch (error) {
        console.error('Failed to log bandwidth:', error);
        // Fail silently to not impact user experience
    }
}

/**
 * Gets total bandwidth usage.
 * Currently returns all-time usage as a sum of daily records.
 * In a production app with massive data, we would likely maintain a running total
 * in a separate document or use an aggregation query.
 */
export async function getBandwidthUsage(period: 'all' | '30d' = 'all'): Promise<number> {
    try {
        let query = db.collection(ANALYTICS_COLLECTION)
            .doc(BANDWIDTH_DOC)
            .collection(DAILY_SUBCOLLECTION)
            .select('totalBytes');

        if (period === '30d') {
            const date30DaysAgo = new Date();
            date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
            const dateStr = date30DaysAgo.toISOString().split('T')[0];
            query = query.where('date', '>=', dateStr);
        }

        const snapshot = await query.get();

        let total = 0;
        snapshot.docs.forEach(doc => {
            total += (doc.data().totalBytes || 0);
        });

        return total;
    } catch (error) {
        console.error('Failed to get bandwidth usage:', error);
        return 0;
    }
}
