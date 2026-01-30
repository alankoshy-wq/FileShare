import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

dotenv.config();

const client = new SecretManagerServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'sendshare-project';

export const secrets = {
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME || 'sendshare-uploads',
};

/**
 * Maps our internal secret keys to Google Secret Manager secret names
 */
const GSM_MAP: Record<keyof typeof secrets, string> = {
    SMTP_USER: 'sendshare-smtp-user',
    SMTP_PASS: 'sendshare-smtp-pass',
    JWT_SECRET: 'sendshare-jwt-secret',
    GCS_BUCKET_NAME: 'sendshare-bucket-name',
};

/**
 * Attempts to load a single secret from Google Secret Manager.
 * Falls back to existing value if fetch fails.
 */
async function accessSecret(name: string): Promise<string | null> {
    try {
        const [version] = await client.accessSecretVersion({
            name: `projects/${projectId}/secrets/${name}/versions/latest`,
        });

        const payload = version.payload?.data?.toString();
        return payload || null;
    } catch (error) {
        // We log warnings but don't throw, enabling fallback to .env/env vars
        console.warn(`[Secrets] Could not load secret "${name}" from GSM:`, (error as any).message);
        return null;
    }
}

/**
 * Initializes all secrets by first checking GSM and then falling back to process.env.
 */
export async function loadSecrets() {
    console.log('[Secrets] Loading secrets...');

    const entries = Object.entries(GSM_MAP) as [keyof typeof secrets, string][];

    await Promise.all(entries.map(async ([key, gsmName]) => {
        const value = await accessSecret(gsmName);
        if (value) {
            secrets[key] = value;
            // console.log(`[Secrets] Successfully loaded ${key} from GSM`);
        } else {
            console.log(`[Secrets] Using fallback for ${key} from environment/defaults`);
        }
    }));

    console.log('[Secrets] Secret initialization complete.');
}
