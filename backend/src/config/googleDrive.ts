import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';

let driveInstance: drive_v3.Drive | null = null;

/**
 * Resolves Google Service Account credentials from:
 * 1. GOOGLE_CREDENTIALS_JSON environment variable
 * 2. credentials.json file in current or parent directory
 * 3. GOOGLE_CREDENTIALS_PATH environment variable
 */
export const getGoogleCredentials = (): any | null => {
  // 1. Check environment variable GOOGLE_CREDENTIALS_JSON
  const rawEnv = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  if (rawEnv && rawEnv !== '') {
    try {
      return JSON.parse(rawEnv);
    } catch {
      console.warn('[GoogleDrive] Could not parse GOOGLE_CREDENTIALS_JSON from env.');
    }
  }

  // 2. Check GOOGLE_CREDENTIALS_PATH or default credentials.json locations
  const candidatePaths = [
    process.env.GOOGLE_CREDENTIALS_PATH,
    path.resolve(process.cwd(), 'credentials.json'),
    path.resolve(process.cwd(), 'backend/credentials.json'),
    path.resolve(process.cwd(), '../credentials.json'),
  ].filter(Boolean) as string[];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        console.log(`[GoogleDrive] Loaded credentials from file: ${filePath}`);
        return parsed;
      } catch (err) {
        console.warn(`[GoogleDrive] Error reading ${filePath}:`, (err as Error).message);
      }
    }
  }

  return null;
};

export const getGoogleDriveClient = (): drive_v3.Drive => {
  if (driveInstance) {
    return driveInstance;
  }

  const credentials = getGoogleCredentials();

  if (!credentials) {
    console.warn(
      '[GoogleDrive] No Google Service Account credentials found. Live Drive syncing will be disabled until configured.'
    );
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    driveInstance = google.drive({ version: 'v3', auth });
    return driveInstance;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    driveInstance = google.drive({ version: 'v3', auth });
    console.log(
      `[GoogleDrive] Initialized Google Drive client for Service Account: ${credentials.client_email}`
    );
    return driveInstance;
  } catch (error) {
    console.error(
      '[GoogleDrive] Failed to initialize Google Drive client:',
      (error as Error).message
    );
    throw error;
  }
};

export const isGoogleDriveConfigured = (): boolean => {
  return getGoogleCredentials() !== null;
};

// Export configured drive client instance
export const drive = getGoogleDriveClient();
