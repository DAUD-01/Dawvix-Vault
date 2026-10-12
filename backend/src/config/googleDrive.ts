import { google, drive_v3 } from "googleapis";

let driveInstance: drive_v3.Drive | null = null;

/**
 * Initializes and returns the Google Drive API client using OAuth 2.0 User Credentials.
 * Uses client ID, client secret, and refresh token from environment variables.
 */
export const getGoogleDriveClient = (): drive_v3.Drive => {
  if (driveInstance) return driveInstance;

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn(
      "[GoogleDrive] Missing OAuth2 credentials in .env. Live Drive syncing is disabled.",
    );
    throw new Error(
      "Google Drive OAuth credentials missing from environment variables.",
    );
  }

  try {
    const auth = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground",
    );

    auth.setCredentials({ refresh_token: refreshToken });

    driveInstance = google.drive({ version: "v3", auth });
    console.log(
      "[GoogleDrive] Initialized Google Drive client via OAuth2 User Token.",
    );
    return driveInstance;
  } catch (error) {
    console.error(
      "[GoogleDrive] Failed to initialize OAuth2 client:",
      (error as Error).message,
    );
    throw error;
  }
};

/**
 * Checks whether all required OAuth 2.0 credentials exist in environment variables.
 */
export const isGoogleDriveConfigured = (): boolean => {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim() &&
    process.env.GOOGLE_REFRESH_TOKEN?.trim()
  );
};

/**
 * Mock helper maintaining backward compatibility for health check and drive status endpoints.
 */
export const getGoogleCredentials = (): any | null => {
  if (isGoogleDriveConfigured()) {
    return { client_email: "OAuth2 Authenticated User" };
  }
  return null;
};

/**
 * Export proxy instance that dynamically routes calls to active drive client.
 */
export const drive = new Proxy({} as drive_v3.Drive, {
  get(_target, prop) {
    const client = getGoogleDriveClient();
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});
