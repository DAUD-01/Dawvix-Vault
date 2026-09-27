import { Request, Response } from 'express';
import { drive, isGoogleDriveConfigured, getGoogleCredentials } from '../config/googleDrive.js';
import { FileMetadata } from '../models/FileMetadata.js';

/**
 * Returns total vault statistics including file count, folder count, total size, and sync status.
 */
export const getVaultStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [stats] = await FileMetadata.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: {
            $sum: {
              $cond: [{ $eq: ['$isFolder', false] }, 1, 0],
            },
          },
          totalFolders: {
            $sum: {
              $cond: [{ $eq: ['$isFolder', true] }, 1, 0],
            },
          },
          totalBytes: {
            $sum: {
              $cond: [{ $eq: ['$isFolder', false] }, '$size', 0],
            },
          },
          lastSyncedAt: { $max: '$lastSyncedAt' },
        },
      },
    ]);

    const creds = getGoogleCredentials();

    res.json({
      success: true,
      stats: {
        totalFiles: stats?.totalFiles || 0,
        totalFolders: stats?.totalFolders || 0,
        totalBytes: stats?.totalBytes || 0,
        lastSyncedAt: stats?.lastSyncedAt || null,
        serviceAccountEmail: creds?.client_email || null,
        gdriveConfigured: isGoogleDriveConfigured(),
      },
    });
  } catch (error) {
    console.error('[DriveController] getVaultStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vault statistics.',
      error: (error as Error).message,
    });
  }
};

/**
 * Returns cached file metadata from MongoDB for the requested folder, or searches across vault.
 * Supports query parameters:
 * - folderId: ID of folder to browse (default: root)
 * - all: 'true' to search across entire vault ignoring parent
 * - search: text query filter
 * - sortBy: 'name' | 'size' | 'lastSyncedAt' | 'mimeType'
 * - order: 'asc' | 'desc'
 */
export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || 'root';
    const folderId = (req.query.folderId as string)?.trim() || rootFolderId;
    const isGlobalSearch = req.query.all === 'true';
    const searchQuery = (req.query.search as string)?.trim();
    const sortBy = (req.query.sortBy as string) || 'name';
    const order = (req.query.order as string)?.toLowerCase() === 'desc' ? -1 : 1;

    const filter: any = {};

    if (!isGlobalSearch) {
      filter.parents = folderId;
    }

    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: 'i' };
    }

    // Build sort object: Folders always appear first in standard folder view
    const sortObj: any = { isFolder: -1 };
    if (sortBy === 'size') {
      sortObj.size = order;
    } else if (sortBy === 'lastSyncedAt') {
      sortObj.lastSyncedAt = order;
    } else if (sortBy === 'mimeType') {
      sortObj.mimeType = order;
    } else {
      sortObj.name = order;
    }

    const files = await FileMetadata.find(filter).sort(sortObj).lean();

    // Retrieve folder metadata to help frontend display current folder name
    let currentFolder = null;
    if (folderId !== rootFolderId && folderId !== 'root') {
      currentFolder = await FileMetadata.findOne({ driveId: folderId }).lean();
    }

    const creds = getGoogleCredentials();

    res.json({
      success: true,
      rootFolderId,
      currentFolderId: folderId,
      isGlobalSearch,
      currentFolder: currentFolder
        ? {
            id: currentFolder.driveId,
            name: currentFolder.name,
            parents: currentFolder.parents,
          }
        : null,
      serviceAccountEmail: creds?.client_email || null,
      count: files.length,
      files: files.map((file) => ({
        id: file.driveId,
        driveId: file.driveId,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        parents: file.parents,
        isFolder: file.isFolder,
        lastSyncedAt: file.lastSyncedAt,
      })),
    });
  } catch (error) {
    console.error('[DriveController] getFiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files from database.',
      error: (error as Error).message,
    });
  }
};

/**
 * Recursively or globally lists files accessible to the service account
 * and upserts them into MongoDB using findOneAndUpdate({ driveId }, ..., { upsert: true }).
 */
export const syncDrive = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isGoogleDriveConfigured()) {
      res.status(400).json({
        success: false,
        message:
          'Google Drive credentials not configured. Please ensure credentials.json or GOOGLE_CREDENTIALS_JSON is configured.',
      });
      return;
    }

    const targetFolderId =
      (req.body.folderId as string)?.trim() ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() ||
      'root';

    console.log(`[DriveSync] Initiating Google Drive sync. Target: ${targetFolderId}`);

    let syncedCount = 0;

    if (targetFolderId === 'root') {
      let pageToken: string | undefined = undefined;
      const allItems: any[] = [];
      const itemMap = new Map<string, any>();

      do {
        const response: any = await drive.files.list({
          q: 'trashed = false',
          fields: 'nextPageToken, files(id, name, mimeType, size, parents, createdTime, modifiedTime)',
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = response.data.files || [];
        for (const file of files) {
          allItems.push(file);
          itemMap.set(file.id, file);
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      // Upsert discovered items into MongoDB
      for (const item of allItems) {
        if (!item.id || !item.name) continue;

        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        let itemParents = item.parents || [];

        const hasKnownParent = itemParents.some((pId: string) => itemMap.has(pId));
        if (!hasKnownParent || itemParents.length === 0) {
          if (!itemParents.includes('root')) {
            itemParents = ['root', ...itemParents];
          }
        }

        await FileMetadata.findOneAndUpdate(
          { driveId: item.id },
          {
            driveId: item.id,
            name: item.name,
            mimeType: item.mimeType || 'application/octet-stream',
            size: item.size ? parseInt(item.size, 10) : 0,
            parents: itemParents,
            isFolder,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        syncedCount++;
      }
    } else {
      // Specific folder crawl
      const folderQueue: string[] = [targetFolderId];
      const visitedFolders = new Set<string>();

      while (folderQueue.length > 0) {
        const currentFolderId = folderQueue.shift()!;
        if (visitedFolders.has(currentFolderId)) continue;
        visitedFolders.add(currentFolderId);

        let pageToken: string | undefined = undefined;

        do {
          const query = `'${currentFolderId}' in parents and trashed = false`;
          const response: any = await drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, name, mimeType, size, parents, createdTime, modifiedTime)',
            pageSize: 1000,
            pageToken,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });

          const items = response.data.files || [];

          for (const item of items) {
            if (!item.id || !item.name) continue;

            const isFolder = item.mimeType === 'application/vnd.google-apps.folder';

            await FileMetadata.findOneAndUpdate(
              { driveId: item.id },
              {
                driveId: item.id,
                name: item.name,
                mimeType: item.mimeType || 'application/octet-stream',
                size: item.size ? parseInt(item.size, 10) : 0,
                parents: item.parents && item.parents.length > 0 ? item.parents : [currentFolderId],
                isFolder,
                lastSyncedAt: new Date(),
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            syncedCount++;

            if (isFolder && !visitedFolders.has(item.id)) {
              folderQueue.push(item.id);
            }
          }

          pageToken = response.data.nextPageToken || undefined;
        } while (pageToken);
      }
    }

    console.log(`[DriveSync] Sync complete. Processed ${syncedCount} items.`);

    const creds = getGoogleCredentials();

    res.json({
      success: true,
      message:
        syncedCount > 0
          ? `Google Drive sync completed. ${syncedCount} files and folders indexed.`
          : `Sync completed. 0 items found. If your folder is empty, share your Google Drive folder with "${creds?.client_email}" as Viewer.`,
      syncedCount,
      serviceAccountEmail: creds?.client_email || null,
      rootFolderId: targetFolderId,
    });
  } catch (error) {
    console.error('[DriveController] syncDrive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync with Google Drive.',
      error: (error as Error).message,
    });
  }
};

/**
 * Shared stream handler for both download (attachment) and view/preview (inline).
 * Supports RFC 7233 byte-range requests for instant media seeking and resumable transfers.
 */
const handleStream = async (
  req: Request,
  res: Response,
  isInline: boolean
): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      res.status(400).json({ success: false, message: 'Missing fileId parameter.' });
      return;
    }

    const dispositionType = isInline ? 'inline' : 'attachment';

    // 1. Check if configured with Google Drive API
    if (!isGoogleDriveConfigured()) {
      res.status(400).json({
        success: false,
        message: 'Google Drive credentials not configured. Please ensure credentials.json is present.',
      });
      return;
    }

    // 2. Fetch metadata (name, mimeType, size) via drive.files.get
    let file: any = null;
    try {
      const metaResponse = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
        supportsAllDrives: true,
      });
      file = metaResponse.data;
    } catch (apiErr: any) {
      res.status(404).json({
        success: false,
        message: `File not found on Google Drive: ${apiErr.message}`,
      });
      return;
    }

    if (!file || !file.name) {
      res.status(404).json({ success: false, message: 'File not found on Google Drive.' });
      return;
    }

    const mimeType = file.mimeType || 'application/octet-stream';
    let downloadFileName = file.name;

    // Reject folder download/stream
    if (mimeType === 'application/vnd.google-apps.folder') {
      res.status(400).json({
        success: false,
        message: 'Cannot view or download a folder directly. Please navigate inside the folder.',
      });
      return;
    }

    // Safe ASCII fallback name for legacy header parsers
    const safeAsciiName = downloadFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');

    // 3. Google Workspace Docs (Docs, Sheets, Slides) -> Export as PDF
    if (mimeType.startsWith('application/vnd.google-apps.')) {
      const exportMimeType = 'application/pdf';
      if (!downloadFileName.toLowerCase().endsWith('.pdf')) {
        downloadFileName += '.pdf';
      }
      const safePdfName = downloadFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');

      res.setHeader('Content-Type', exportMimeType);
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="${safePdfName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`
      );

      const streamResponse = await drive.files.export(
        {
          fileId,
          mimeType: exportMimeType,
        },
        { responseType: 'stream' }
      );

      streamResponse.data.on('error', (err: any) => {
        console.error('[DriveController] Export stream error:', err?.message || err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Streaming export error occurred.' });
        }
      });

      streamResponse.data.pipe(res);
      return;
    }

    // 4. Binary/regular file streaming with HTTP Range Request support
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`
    );
    res.setHeader('Accept-Ranges', 'bytes');

    const requestHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    try {
      const streamResponse = await drive.files.get(
        {
          fileId,
          alt: 'media',
          supportsAllDrives: true,
        },
        {
          headers: requestHeaders,
          responseType: 'stream',
        }
      );

      // Forward status code (206 Partial Content or 200 OK)
      if (streamResponse.status === 206) {
        res.status(206);
        if (streamResponse.headers['content-range']) {
          res.setHeader('Content-Range', streamResponse.headers['content-range']);
        }
      }

      if (streamResponse.headers['content-length']) {
        res.setHeader('Content-Length', streamResponse.headers['content-length']);
      } else if (file.size && !rangeHeader) {
        res.setHeader('Content-Length', file.size);
      }

      streamResponse.data.on('error', (err: any) => {
        if (err?.code !== 'ECONNRESET' && err?.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
          console.error('[DriveController] Stream transfer error:', err?.message || err);
        }
      });

      // Handle client disconnect gracefully
      req.on('close', () => {
        if (streamResponse.data && typeof streamResponse.data.destroy === 'function') {
          streamResponse.data.destroy();
        }
      });

      streamResponse.data.pipe(res);
    } catch (streamErr: any) {
      if (streamErr?.response?.status === 416) {
        res.status(416).setHeader('Content-Range', `bytes */${file.size || 0}`).end();
        return;
      }
      throw streamErr;
    }
  } catch (error: any) {
    console.error('[DriveController] handleStream error:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to stream file from Google Drive.',
        error: error?.message || 'Stream error',
      });
    }
  }
};

/**
 * Downloads file as an attachment
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  const isInline = req.query.inline === 'true';
  await handleStream(req, res, isInline);
};

/**
 * Streams file inline for in-browser / in-modal viewing
 */
export const viewFile = async (req: Request, res: Response): Promise<void> => {
  await handleStream(req, res, true);
};

/**
 * Returns text content of text/code files for rich in-window code viewer
 */
export const getFileTextContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      res.status(400).json({ success: false, message: 'Missing fileId parameter.' });
      return;
    }

    if (!isGoogleDriveConfigured()) {
      res.status(400).json({
        success: false,
        message: 'Google Drive credentials not configured.',
      });
      return;
    }

    const meta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true,
    });

    const file = meta.data;
    const mime = file.mimeType || '';

    // If Google Doc, export as plain text
    if (mime === 'application/vnd.google-apps.document') {
      const textRes = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });
      res.json({
        success: true,
        name: file.name,
        mimeType: 'text/plain',
        content: textRes.data,
      });
      return;
    }

    // Standard media fetch as text
    const textRes = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'text' }
    );

    res.json({
      success: true,
      name: file.name,
      mimeType: file.mimeType,
      content: typeof textRes.data === 'string' ? textRes.data : JSON.stringify(textRes.data, null, 2),
    });
  } catch (err) {
    console.error('[DriveController] getFileTextContent error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file text content.',
      error: (err as Error).message,
    });
  }
};
