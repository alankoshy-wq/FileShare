import { db } from './db.js';

const USERS_COLLECTION = 'users';

interface UserProfile {
    email: string;
    passwordHash: string;
    name: string;
    createdAt: string;
    role?: 'admin' | 'user'; // Add role support
}

// Transfer history item
interface TransferHistoryItem {
    transferId: string;
    addedAt: string;
}

export async function createUser(email: string, passwordHash: string, name: string): Promise<void> {
    const docRef = db.collection(USERS_COLLECTION).doc(email);
    const doc = await docRef.get();

    if (doc.exists) {
        throw new Error('User already exists');
    }

    // Hardcode Admin for specific email
    const normalizedEmail = email.toLowerCase().trim();
    const role = normalizedEmail === 'alankoshy.12@gmail.com' ? 'admin' : 'user';

    const profile: UserProfile = {
        email,
        passwordHash,
        name,
        createdAt: new Date().toISOString(),
        role
    };

    await docRef.set(profile);
}

export async function getUser(email: string): Promise<UserProfile | null> {
    const docRef = db.collection(USERS_COLLECTION).doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    return doc.data() as UserProfile;
}

export async function appendTransferHistory(email: string, transferId: string): Promise<void> {
    const userRef = db.collection(USERS_COLLECTION).doc(email);

    // Store history in a subcollection 'transfers'
    // Document ID can be the transferId itself to ensure uniqueness (prevent duplicates efficiently)
    await userRef.collection('transfers').doc(transferId).set({
        transferId,
        addedAt: new Date().toISOString()
    });
}

export async function getUserHistory(email: string): Promise<string[]> {
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    const snapshot = await userRef.collection('transfers').orderBy('addedAt', 'desc').get();

    return snapshot.docs.map(doc => doc.id);
}

export async function deleteUser(email: string): Promise<void> {
    const userRef = db.collection(USERS_COLLECTION).doc(email);

    // Delete all history items in subcollection
    const snapshot = await userRef.collection('transfers').get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete user profile
    await userRef.delete();
}

export async function updateUserPassword(email: string, passwordHash: string): Promise<void> {
    const userRef = db.collection(USERS_COLLECTION).doc(email);
    await userRef.update({ passwordHash });
}
