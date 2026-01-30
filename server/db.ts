
import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Initialize Firestore
// Assuming GOOGLE_APPLICATION_CREDENTIALS is set in .env
// or a default service account path is available.

const db = new Firestore();

export { db };
