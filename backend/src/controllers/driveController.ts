import { Request, Response } from "express";
import { PassThrough } from "stream";
import {
  drive,
  isGoogleDriveConfigured,
  getGoogleCredentials,
} from "../config/googleDrive.js";
import { FileMetadata } from "../models/FileMetadata.js";
import {
  findSyncthingArtifactIds,
  isSyncthingArtifactName,
} from "../utils/syncthingArtifacts.js";

/**
 * Helper to retrieve effective root folder ID from environment or fallback to 'root'
 */
const getRootFolderId = (): string => {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || "root";
};

/**
 * Returns total vault statistics including file count, folder count, total size, and sync status.
 */
export const getVaultStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const excludedIds = await findSyncthingArtifactIds();
    const [stats] = await FileMetadata.aggregate([
      { $match: { driveId: { $nin: excludedIds } } },
      {
        $group: {
          _id: null,
          totalFiles: {
            $sum: { $cond: [{ $eq: ["$isFolder", false] }, 1, 0] },
          },
          totalFolders: {
            $sum: { $cond: [{ $eq: ["$isFolder", true] }, 1, 0] },
          },
          totalBytes: {
            $sum: {
              $cond: [{ $eq: ["$isFolder", false] }, "$size", 0],
            },
          },
          lastSyncedAt: { $max: "$lastSyncedAt" },
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
    console.error("[DriveController] getVaultStats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve vault statistics.",
      error: (error as Error).message,
    });
  }
};

export const performDriveSync = async (
  folderIdParam?: string,
): Promise<{
  syncedCount: number;
  deletedCount: number;
  rootFolderId: string;
}> => {
  if (!isGoogleDriveConfigured()) {
    throw new Error(
      "Google Drive credentials not configured. Please ensure credentials.json or GOOGLE_CREDENTIALS_JSON is configured.",
    );
  }

  const rootFolderId = getRootFolderId();
  const targetFolderId = folderIdParam?.trim() || rootFolderId;

  console.log(
    `[DriveSync] Initiating reconciliation sync with Google Drive. Target: ${targetFolderId}`,
  );

  let syncedCount = 0;
  let deletedCount = 0;

  const existingArtifactIds = await findSyncthingArtifactIds();
  if (existingArtifactIds.length > 0) {
    const purgeResult = await FileMetadata.deleteMany({
      driveId: { $in: existingArtifactIds },
    });
    deletedCount += purgeResult.deletedCount || 0;
  }

  if (targetFolderId === "root") {
    let pageToken: string | undefined = undefined;
    const allItems: any[] = [];

    do {
      const response: any = await drive.files.list({
        q: "trashed = false",
        fields:
          "nextPageToken, files(id, name, mimeType, size, parents, createdTime, modifiedTime)",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];
      for (const file of files) {
        if (!file.id || !file.name) continue;
        allItems.push(file);
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    const excludedIds = new Set<string>(
      allItems
        .filter((item) => isSyncthingArtifactName(item.name))
        .map((item) => item.id),
    );
    let foundExcludedParent = true;
    while (foundExcludedParent) {
      foundExcludedParent = false;
      for (const item of allItems) {
        if (
          !excludedIds.has(item.id) &&
          item.parents?.some((parentId: string) => excludedIds.has(parentId))
        ) {
          excludedIds.add(item.id);
          foundExcludedParent = true;
        }
      }
    }

    const visibleItems = allItems.filter((item) => !excludedIds.has(item.id));
    const itemMap = new Map(visibleItems.map((item) => [item.id, item]));
    const discoveredIds = new Set(visibleItems.map((item) => item.id));

    for (const item of visibleItems) {
      const isFolder = item.mimeType === "application/vnd.google-apps.folder";
      let itemParents = item.parents || [];

      const hasKnownParent = itemParents.some((pId: string) =>
        itemMap.has(pId),
      );
      if (!hasKnownParent || itemParents.length === 0) {
        if (!itemParents.includes("root")) {
          itemParents = ["root", ...itemParents];
        }
      }

      await FileMetadata.findOneAndUpdate(
        { driveId: item.id },
        {
          driveId: item.id,
          name: item.name,
          mimeType: item.mimeType || "application/octet-stream",
          size: item.size ? parseInt(item.size, 10) : 0,
          parents: itemParents,
          isFolder,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      syncedCount++;
    }

    const deleteResult = await FileMetadata.deleteMany({
      driveId: { $nin: Array.from(discoveredIds), $not: /^local_/ },
    });
    deletedCount = deleteResult.deletedCount || 0;
  } else {
    const folderQueue: string[] = [targetFolderId];
    const visitedFolders = new Set<string>();
    const discoveredIds = new Set<string>();

    try {
      const targetMeta: any = await drive.files.get({
        fileId: targetFolderId,
        fields: "id, name, mimeType, parents",
        supportsAllDrives: true,
      });
      if (targetMeta?.data?.id) {
        discoveredIds.add(targetMeta.data.id);
        await FileMetadata.findOneAndUpdate(
          { driveId: targetMeta.data.id },
          {
            driveId: targetMeta.data.id,
            name: targetMeta.data.name || "Root Folder",
            mimeType:
              targetMeta.data.mimeType || "application/vnd.google-apps.folder",
            size: 0,
            parents: targetMeta.data.parents || ["root"],
            isFolder: true,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    } catch {
      // Ignore if root metadata query fails
    }

    while (folderQueue.length > 0) {
      const currentFolderId = folderQueue.shift()!;
      if (visitedFolders.has(currentFolderId)) continue;
      visitedFolders.add(currentFolderId);

      let pageToken: string | undefined = undefined;

      do {
        const query = `'${currentFolderId}' in parents and trashed = false`;
        const response: any = await drive.files.list({
          q: query,
          fields:
            "nextPageToken, files(id, name, mimeType, size, parents, createdTime, modifiedTime)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const items = response.data.files || [];

        for (const item of items) {
          if (!item.id || !item.name) continue;
          if (isSyncthingArtifactName(item.name)) continue;

          discoveredIds.add(item.id);
          const isFolder =
            item.mimeType === "application/vnd.google-apps.folder";

          await FileMetadata.findOneAndUpdate(
            { driveId: item.id },
            {
              driveId: item.id,
              name: item.name,
              mimeType: item.mimeType || "application/octet-stream",
              size: item.size ? parseInt(item.size, 10) : 0,
              parents:
                item.parents && item.parents.length > 0
                  ? item.parents
                  : [currentFolderId],
              isFolder,
              lastSyncedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );

          syncedCount++;

          if (isFolder && !visitedFolders.has(item.id)) {
            folderQueue.push(item.id);
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);
    }

    const deleteResult = await FileMetadata.deleteMany({
      parents: { $in: Array.from(visitedFolders) },
      driveId: { $nin: Array.from(discoveredIds), $not: /^local_/ },
    });
    deletedCount = deleteResult.deletedCount || 0;
  }

  console.log(
    `[DriveSync] Sync complete. Processed ${syncedCount} items, pruned ${deletedCount} stale items.`,
  );

  return {
    syncedCount,
    deletedCount,
    rootFolderId: targetFolderId,
  };
};

export const getFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const rootFolderId = getRootFolderId();
    const folderId = (req.query.folderId as string)?.trim() || rootFolderId;
    const isGlobalSearch = req.query.all === "true";
    const searchQuery = (req.query.search as string)?.trim();
    const sortBy = (req.query.sortBy as string) || "name";
    const order =
      (req.query.order as string)?.toLowerCase() === "desc" ? -1 : 1;
    const shouldRefresh = req.query.refresh === "true";

    if (shouldRefresh && isGoogleDriveConfigured()) {
      try {
        await performDriveSync(
          folderId !== "root" && folderId !== rootFolderId
            ? folderId
            : undefined,
        );
      } catch (syncErr) {
        console.warn(
          "[DriveController] Auto-sync on refresh failed:",
          (syncErr as Error).message,
        );
      }
    }

    const filter: any = {};

    if (!isGlobalSearch) {
      filter.parents = folderId;
    }

    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" };
    }

    const sortObj: any = { isFolder: -1 };
    if (sortBy === "size") {
      sortObj.size = order;
    } else if (sortBy === "lastSyncedAt") {
      sortObj.lastSyncedAt = order;
    } else if (sortBy === "mimeType") {
      sortObj.mimeType = order;
    } else {
      sortObj.name = order;
    }

    const excludedIds = await findSyncthingArtifactIds();
    filter.driveId = { $nin: excludedIds };

    const files = await FileMetadata.find(filter).sort(sortObj).lean();
    const uniqueFiles = Array.from(
      new Map(files.map((file) => [file.driveId, file])).values(),
    );

    let currentFolder = null;
    if (folderId !== rootFolderId && folderId !== "root") {
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
      count: uniqueFiles.length,
      files: uniqueFiles.map((file) => ({
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
    console.error("[DriveController] getFiles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve files from database.",
      error: (error as Error).message,
    });
  }
};

export const syncDrive = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetFolderId = req.body?.folderId as string | undefined;
    const result = await performDriveSync(targetFolderId);
    const creds = getGoogleCredentials();

    let msg = "";
    if (result.syncedCount > 0 || result.deletedCount > 0) {
      msg = `Sync complete: ${result.syncedCount} items updated`;
      if (result.deletedCount > 0) {
        msg += `, ${result.deletedCount} removed/stale items pruned`;
      }
      msg += ".";
    } else {
      msg = `Sync completed. 0 items found. Share your Google Drive folder with "${creds?.client_email}" as Editor.`;
    }

    res.json({
      success: true,
      message: msg,
      syncedCount: result.syncedCount,
      deletedCount: result.deletedCount,
      serviceAccountEmail: creds?.client_email || null,
      rootFolderId: result.rootFolderId,
    });
  } catch (error) {
    console.error("[DriveController] syncDrive error:", error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || "Failed to sync with Google Drive.",
      error: (error as Error).message,
    });
  }
};

const handleStream = async (
  req: Request,
  res: Response,
  isInline: boolean,
): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      res
        .status(400)
        .json({ success: false, message: "Missing fileId parameter." });
      return;
    }

    const dispositionType = isInline ? "inline" : "attachment";

    if (fileId.startsWith("local_")) {
      const fs = await import("fs");
      const path = await import("path");
      const localFilePath = path.join(process.cwd(), "uploads", fileId);

      if (!fs.existsSync(localFilePath)) {
        res
          .status(404)
          .json({ success: false, message: "Local file not found." });
        return;
      }

      const fileMeta = await FileMetadata.findOne({ driveId: fileId });
      const filename = fileMeta?.name || "download";
      const mime = fileMeta?.mimeType || "application/octet-stream";
      const safeAsciiName = filename
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/"/g, '\\"');

      res.setHeader("Content-Type", mime);
      res.setHeader(
        "Content-Disposition",
        `${dispositionType}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );

      const stat = fs.statSync(localFilePath);
      res.setHeader("Content-Length", stat.size);

      const readStream = fs.createReadStream(localFilePath);
      readStream.pipe(res);
      return;
    }

    if (!isGoogleDriveConfigured()) {
      res.status(400).json({
        success: false,
        message:
          "Google Drive credentials not configured. Please ensure credentials.json is present.",
      });
      return;
    }

    let file: any = null;
    try {
      const metaResponse = await drive.files.get({
        fileId,
        fields: "id, name, mimeType, size",
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
      res
        .status(404)
        .json({ success: false, message: "File not found on Google Drive." });
      return;
    }

    const mimeType = file.mimeType || "application/octet-stream";
    let downloadFileName = file.name;

    if (mimeType === "application/vnd.google-apps.folder") {
      res.status(400).json({
        success: false,
        message:
          "Cannot view or download a folder directly. Please navigate inside the folder.",
      });
      return;
    }

    const safeAsciiName = downloadFileName
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/"/g, '\\"');

    if (mimeType.startsWith("application/vnd.google-apps.")) {
      const exportMimeType = "application/pdf";
      if (!downloadFileName.toLowerCase().endsWith(".pdf")) {
        downloadFileName += ".pdf";
      }
      const safePdfName = downloadFileName
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/"/g, '\\"');

      res.setHeader("Content-Type", exportMimeType);
      res.setHeader(
        "Content-Disposition",
        `${dispositionType}; filename="${safePdfName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
      );

      const streamResponse = await drive.files.export(
        {
          fileId,
          mimeType: exportMimeType,
        },
        { responseType: "stream" },
      );

      streamResponse.data.on("error", (err: any) => {
        console.error(
          "[DriveController] Export stream error:",
          err?.message || err,
        );
        if (!res.headersSent) {
          res
            .status(500)
            .json({
              success: false,
              message: "Streaming export error occurred.",
            });
        }
      });

      streamResponse.data.pipe(res);
      return;
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
    );
    res.setHeader("Accept-Ranges", "bytes");

    const requestHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      requestHeaders["Range"] = rangeHeader;
    }

    try {
      const streamResponse = await drive.files.get(
        {
          fileId,
          alt: "media",
          supportsAllDrives: true,
        },
        {
          headers: requestHeaders,
          responseType: "stream",
        },
      );

      if (streamResponse.status === 206) {
        res.status(206);
        if (streamResponse.headers["content-range"]) {
          res.setHeader(
            "Content-Range",
            streamResponse.headers["content-range"],
          );
        }
      }

      if (streamResponse.headers["content-length"]) {
        res.setHeader(
          "Content-Length",
          streamResponse.headers["content-length"],
        );
      } else if (file.size && !rangeHeader) {
        res.setHeader("Content-Length", file.size);
      }

      streamResponse.data.on("error", (err: any) => {
        if (
          err?.code !== "ECONNRESET" &&
          err?.code !== "ERR_STREAM_PREMATURE_CLOSE"
        ) {
          console.error(
            "[DriveController] Stream transfer error:",
            err?.message || err,
          );
        }
      });

      req.on("close", () => {
        if (
          streamResponse.data &&
          typeof streamResponse.data.destroy === "function"
        ) {
          streamResponse.data.destroy();
        }
      });

      streamResponse.data.pipe(res);
    } catch (streamErr: any) {
      if (streamErr?.response?.status === 416) {
        res
          .status(416)
          .setHeader("Content-Range", `bytes */${file.size || 0}`)
          .end();
        return;
      }
      throw streamErr;
    }
  } catch (error: any) {
    console.error(
      "[DriveController] handleStream error:",
      error?.message || error,
    );
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to stream file from Google Drive.",
        error: error?.message || "Stream error",
      });
    }
  }
};

export const downloadFile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const isInline = req.query.inline === "true";
  await handleStream(req, res, isInline);
};

export const viewFile = async (req: Request, res: Response): Promise<void> => {
  await handleStream(req, res, true);
};

export const getFileTextContent = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      res
        .status(400)
        .json({ success: false, message: "Missing fileId parameter." });
      return;
    }

    if (fileId.startsWith("local_")) {
      const fs = await import("fs");
      const path = await import("path");
      const localFilePath = path.join(process.cwd(), "uploads", fileId);

      if (!fs.existsSync(localFilePath)) {
        res
          .status(404)
          .json({ success: false, message: "Local file not found." });
        return;
      }

      const fileMeta = await FileMetadata.findOne({ driveId: fileId });
      const content = fs.readFileSync(localFilePath, "utf8");

      res.json({
        success: true,
        name: fileMeta?.name || "local_file",
        mimeType: fileMeta?.mimeType || "text/plain",
        content,
      });
      return;
    }

    if (!isGoogleDriveConfigured()) {
      res.status(400).json({
        success: false,
        message: "Google Drive credentials not configured.",
      });
      return;
    }

    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size",
      supportsAllDrives: true,
    });

    const file = meta.data;
    const mime = file.mimeType || "";

    if (mime === "application/vnd.google-apps.document") {
      const textRes = await drive.files.export({
        fileId,
        mimeType: "text/plain",
      });
      res.json({
        success: true,
        name: file.name,
        mimeType: "text/plain",
        content: textRes.data,
      });
      return;
    }

    const textRes = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "text" },
    );

    res.json({
      success: true,
      name: file.name,
      mimeType: file.mimeType,
      content:
        typeof textRes.data === "string"
          ? textRes.data
          : JSON.stringify(textRes.data, null, 2),
    });
  } catch (err) {
    console.error("[DriveController] getFileTextContent error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve file text content.",
      error: (err as Error).message,
    });
  }
};

export const createFolder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, parentId } = req.body;
    const cleanName = (name as string)?.trim().replace(/[\/\\:*?"<>|]/g, "_");
    if (!cleanName) {
      res
        .status(400)
        .json({ success: false, message: "Valid folder name is required." });
      return;
    }

    const targetParent =
      parentId && parentId !== "root" ? parentId : getRootFolderId();

    let createdFolder: any = null;

    if (isGoogleDriveConfigured()) {
      try {
        const fileMetadata: any = {
          name: cleanName,
          mimeType: "application/vnd.google-apps.folder",
        };

        if (targetParent && targetParent !== "root") {
          fileMetadata.parents = [targetParent];
        }

        const response = await drive.files.create({
          requestBody: fileMetadata,
          fields: "id, name, parents, mimeType",
          supportsAllDrives: true,
        });

        createdFolder = response.data;
      } catch (err: any) {
        console.warn(
          "[DriveController] Google Drive folder create failed, falling back to local folder:",
          err?.message || err,
        );
      }
    }

    if (!createdFolder) {
      const localId =
        "local_folder_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);
      createdFolder = {
        id: localId,
        name: cleanName,
        mimeType: "application/vnd.google-apps.folder",
        parents: targetParent ? [targetParent] : ["root"],
      };
    }

    await FileMetadata.findOneAndUpdate(
      { driveId: createdFolder.id },
      {
        driveId: createdFolder.id,
        name: createdFolder.name,
        mimeType:
          createdFolder.mimeType || "application/vnd.google-apps.folder",
        size: 0,
        parents: createdFolder.parents || [targetParent],
        isFolder: true,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      success: true,
      folder: createdFolder,
      message: `Folder "${cleanName}" created successfully.`,
    });
  } catch (error) {
    console.error("[DriveController] createFolder error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create folder.",
      error: (error as Error).message,
    });
  }
};

export const uploadFiles = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawParentId = req.body.parentId;
    const rootFolderId = getRootFolderId();
    const targetParentId =
      rawParentId && rawParentId !== "root" ? rawParentId : rootFolderId;

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No files provided for upload." });
      return;
    }

    if (!isGoogleDriveConfigured()) {
      res
        .status(400)
        .json({
          success: false,
          message: "Google Drive credentials not configured.",
        });
      return;
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileMetadata: any = {
        name: file.originalname,
      };

      if (targetParentId && targetParentId !== "root") {
        fileMetadata.parents = [targetParentId];
      }

      const bufferStream = new PassThrough();
      bufferStream.end(file.buffer);

      const media = {
        mimeType: file.mimetype,
        body: bufferStream,
      };

      let uploadedFile: any;
      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id, name, parents, mimeType, size",
          supportsAllDrives: true,
        });
        uploadedFile = response.data;
        console.log(
          `[DriveController] Uploaded file "${uploadedFile.name}" to Google Drive (ID: ${uploadedFile.id}).`,
        );
      } catch (driveError: any) {
        console.warn(
          "[DriveController] Google Drive upload failed, falling back to local vault storage:",
          driveError?.message || driveError,
        );
        const fs = await import("fs");
        const path = await import("path");

        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localId =
          "local_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substr(2, 9);
        const localFilePath = path.join(uploadsDir, localId);
        fs.writeFileSync(localFilePath, file.buffer);

        uploadedFile = {
          id: localId,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          parents: targetParentId ? [targetParentId] : ["root"],
        };
      }

      await FileMetadata.findOneAndUpdate(
        { driveId: uploadedFile.id },
        {
          driveId: uploadedFile.id,
          name: uploadedFile.name,
          mimeType: uploadedFile.mimeType || file.mimetype,
          size: uploadedFile.size ? parseInt(uploadedFile.size, 10) : file.size,
          parents: uploadedFile.parents || [targetParentId],
          isFolder: false,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      uploadedFiles.push(uploadedFile);
    }

    res.json({
      success: true,
      files: uploadedFiles,
      message: "Files uploaded successfully.",
    });
  } catch (error) {
    console.error("[DriveController] uploadFiles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload files.",
      error: (error as Error).message,
    });
  }
};

/**
 * MIME type lookup based on file extension
 */
export const getMimeTypeFromName = (filename: string): string => {
  const parts = filename.split(".");
  if (parts.length <= 1) return "text/plain";
  const ext = parts.pop()?.toLowerCase();
  switch (ext) {
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "json":
      return "application/json";
    case "js":
    case "mjs":
    case "cjs":
      return "application/javascript";
    case "ts":
    case "tsx":
      return "application/typescript";
    case "c":
    case "h":
    case "cc":
    case "cpp":
    case "cxx":
    case "hh":
    case "hpp":
    case "hxx":
    case "cs":
    case "dart":
    case "go":
    case "java":
    case "kt":
    case "lua":
    case "m":
    case "mm":
    case "php":
    case "py":
    case "rb":
    case "rs":
    case "scala":
    case "swift":
      return "text/plain";
    case "jsx":
      return "text/jsx";
    case "html":
    case "htm":
      return "text/html";
    case "css":
      return "text/css";
    case "csv":
      return "text/csv";
    case "xml":
      return "application/xml";
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "zip":
      return "application/zip";
    case "mp3":
      return "audio/mpeg";
    case "mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
};

/**
 * Helper to prevent circular moves: checks if targetFolder is a descendant of folderId
 */
const isDescendantOrSelf = async (
  folderId: string,
  potentialAncestorId: string,
): Promise<boolean> => {
  if (folderId === potentialAncestorId) return true;
  let currentId = folderId;
  const visited = new Set<string>();

  while (currentId && currentId !== "root" && !visited.has(currentId)) {
    visited.add(currentId);
    const meta = await FileMetadata.findOne({ driveId: currentId }).lean();
    if (!meta || !meta.parents || meta.parents.length === 0) break;
    const parent = meta.parents[0];
    if (parent === potentialAncestorId) return true;
    currentId = parent;
  }
  return false;
};

/**
 * Recursive delete helper that cleans up local disk files and remote Google Drive files
 */
const deleteItemRecursively = async (
  fileId: string,
): Promise<{ deletedIds: string[] }> => {
  const fs = await import("fs");
  const path = await import("path");
  const uploadsDir = path.join(process.cwd(), "uploads");

  const fileMeta = await FileMetadata.findOne({ driveId: fileId }).lean();
  const allIdsToDelete: string[] = [fileId];

  if (fileMeta?.isFolder) {
    const queue: string[] = [fileId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await FileMetadata.find({ parents: parentId }).lean();
      for (const child of children) {
        allIdsToDelete.push(child.driveId);
        if (child.isFolder) {
          queue.push(child.driveId);
        }
      }
    }
  }

  for (const id of allIdsToDelete) {
    if (id.startsWith("local_")) {
      const localFilePath = path.join(uploadsDir, id);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (e) {
          console.warn("[deleteItemRecursively] Unlink warning for local file:", id, e);
        }
      }
    } else if (isGoogleDriveConfigured()) {
      try {
        await drive.files.delete({ fileId: id, supportsAllDrives: true });
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.warn("[deleteItemRecursively] Drive delete warning:", id, err?.message || err);
        }
      }
    }
  }

  await FileMetadata.deleteMany({ driveId: { $in: allIdsToDelete } });
  return { deletedIds: allIdsToDelete };
};

/**
 * Recursive copy helper for files and folders
 */
const copyItemRecursively = async (
  fileId: string,
  targetFolderId: string,
): Promise<string[]> => {
  const fs = await import("fs");
  const path = await import("path");
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const createdIds: string[] = [];
  const sourceMeta = await FileMetadata.findOne({ driveId: fileId }).lean();
  if (!sourceMeta) return createdIds;
  if (isSyncthingArtifactName(sourceMeta.name)) return createdIds;

  // Determine duplicate naming
  const existing = await FileMetadata.findOne({
    parents: targetFolderId,
    name: sourceMeta.name,
  }).lean();

  let newName = sourceMeta.name;
  if (existing) {
    if (sourceMeta.isFolder) {
      newName = `${sourceMeta.name} (Copy)`;
    } else {
      const dotIndex = sourceMeta.name.lastIndexOf(".");
      if (dotIndex > 0) {
        const base = sourceMeta.name.substring(0, dotIndex);
        const ext = sourceMeta.name.substring(dotIndex);
        newName = `${base} (Copy)${ext}`;
      } else {
        newName = `${sourceMeta.name} (Copy)`;
      }
    }
  }

  if (sourceMeta.isFolder) {
    let newFolderId = "";
    if (!sourceMeta.driveId.startsWith("local_") && isGoogleDriveConfigured()) {
      try {
        const folderMetaReq: any = {
          name: newName,
          mimeType: "application/vnd.google-apps.folder",
        };
        if (targetFolderId && targetFolderId !== "root") {
          folderMetaReq.parents = [targetFolderId];
        }
        const created = await drive.files.create({
          requestBody: folderMetaReq,
          fields: "id, name, parents, mimeType",
          supportsAllDrives: true,
        });
        newFolderId = created.data.id!;
      } catch (err) {
        console.warn("[copyItemRecursively] Drive folder copy fallback to local");
      }
    }

    if (!newFolderId) {
      newFolderId =
        "local_folder_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);
    }

    await FileMetadata.create({
      driveId: newFolderId,
      name: newName,
      mimeType: "application/vnd.google-apps.folder",
      size: 0,
      parents: [targetFolderId],
      isFolder: true,
      lastSyncedAt: new Date(),
    });
    createdIds.push(newFolderId);

    const children = await FileMetadata.find({ parents: fileId }).lean();
    for (const child of children) {
      const childCreated = await copyItemRecursively(child.driveId, newFolderId);
      createdIds.push(...childCreated);
    }
  } else {
    let newFileId = "";
    let newSize = sourceMeta.size || 0;
    let newMimeType = sourceMeta.mimeType || "application/octet-stream";

    if (!sourceMeta.driveId.startsWith("local_") && isGoogleDriveConfigured()) {
      try {
        const driveCopyReq: any = {
          name: newName,
        };
        if (targetFolderId && targetFolderId !== "root") {
          driveCopyReq.parents = [targetFolderId];
        }
        const copied = await drive.files.copy({
          fileId: sourceMeta.driveId,
          requestBody: driveCopyReq,
          fields: "id, name, parents, mimeType, size",
          supportsAllDrives: true,
        });
        newFileId = copied.data.id!;
        newSize = copied.data.size ? parseInt(copied.data.size, 10) : newSize;
        newMimeType = copied.data.mimeType || newMimeType;
      } catch (err) {
        console.warn("[copyItemRecursively] Drive copy failed, fallback to local copy");
      }
    }

    if (!newFileId) {
      const localSourcePath = path.join(uploadsDir, sourceMeta.driveId);
      const newLocalId =
        "local_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);
      const newLocalPath = path.join(uploadsDir, newLocalId);

      if (fs.existsSync(localSourcePath)) {
        fs.copyFileSync(localSourcePath, newLocalPath);
        const stat = fs.statSync(newLocalPath);
        newSize = stat.size;
      } else {
        fs.writeFileSync(newLocalPath, Buffer.from(""));
        newSize = 0;
      }

      newFileId = newLocalId;
    }

    await FileMetadata.create({
      driveId: newFileId,
      name: newName,
      mimeType: newMimeType,
      size: newSize,
      parents: [targetFolderId],
      isFolder: false,
      lastSyncedAt: new Date(),
    });
    createdIds.push(newFileId);
  }

  return createdIds;
};

export const deleteFile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      res
        .status(400)
        .json({ success: false, message: "Missing fileId parameter." });
      return;
    }

    const { deletedIds } = await deleteItemRecursively(fileId);

    res.json({
      success: true,
      message: "Item deleted successfully.",
      deletedCount: deletedIds.length,
    });
  } catch (error) {
    console.error("[DriveController] deleteFile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete item.",
      error: (error as Error).message,
    });
  }
};

export const batchDeleteFiles = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ success: false, message: "No items specified for deletion." });
      return;
    }

    let totalDeleted = 0;
    for (const fileId of fileIds) {
      const { deletedIds } = await deleteItemRecursively(fileId);
      totalDeleted += deletedIds.length;
    }

    res.json({
      success: true,
      message: `Successfully deleted ${fileIds.length} item${fileIds.length === 1 ? '' : 's'}.`,
      deletedCount: totalDeleted,
    });
  } catch (error) {
    console.error("[DriveController] batchDeleteFiles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to batch delete items.",
      error: (error as Error).message,
    });
  }
};

export const renameItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileId, newName } = req.body;
    if (!fileId) {
      res.status(400).json({ success: false, message: "Missing fileId parameter." });
      return;
    }

    const cleanName = (newName as string)?.trim().replace(/[\/\\:*?"<>|]/g, "_");
    if (!cleanName) {
      res.status(400).json({ success: false, message: "A valid new name is required." });
      return;
    }

    const fileMeta = await FileMetadata.findOne({ driveId: fileId });
    if (!fileMeta) {
      res.status(404).json({ success: false, message: "Item not found in vault." });
      return;
    }

    if (!fileId.startsWith("local_") && isGoogleDriveConfigured()) {
      try {
        await drive.files.update({
          fileId,
          requestBody: { name: cleanName },
          supportsAllDrives: true,
        });
      } catch (driveErr: any) {
        console.warn("[renameItem] Google Drive rename warning:", driveErr?.message || driveErr);
      }
    }

    fileMeta.name = cleanName;
    if (!fileMeta.isFolder) {
      fileMeta.mimeType = getMimeTypeFromName(cleanName);
    }
    fileMeta.lastSyncedAt = new Date();
    await fileMeta.save();

    res.json({
      success: true,
      message: `Successfully renamed to "${cleanName}".`,
      file: {
        id: fileMeta.driveId,
        driveId: fileMeta.driveId,
        name: fileMeta.name,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
        parents: fileMeta.parents,
        isFolder: fileMeta.isFolder,
        lastSyncedAt: fileMeta.lastSyncedAt,
      },
    });
  } catch (error) {
    console.error("[DriveController] renameItem error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rename item.",
      error: (error as Error).message,
    });
  }
};

export const moveItems = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileIds, targetFolderId } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ success: false, message: "No items specified to move." });
      return;
    }

    const destFolder = (targetFolderId as string)?.trim() || getRootFolderId();

    // Prevent circular hierarchy moves
    for (const id of fileIds) {
      if (id === destFolder) {
        res.status(400).json({ success: false, message: "Cannot move a folder into itself." });
        return;
      }
      const isCircular = await isDescendantOrSelf(destFolder, id);
      if (isCircular) {
        res.status(400).json({ success: false, message: "Cannot move a folder into one of its subfolders." });
        return;
      }
    }

    let movedCount = 0;
    for (const fileId of fileIds) {
      const fileMeta = await FileMetadata.findOne({ driveId: fileId });
      if (!fileMeta) continue;

      const previousParents = fileMeta.parents || [];

      if (!fileId.startsWith("local_") && isGoogleDriveConfigured()) {
        try {
          const updateParams: any = {
            fileId,
            supportsAllDrives: true,
          };
          if (destFolder !== "root") {
            updateParams.addParents = destFolder;
          }
          const toRemove = previousParents.filter(
            (p) => p !== "root" && p !== destFolder,
          );
          if (toRemove.length > 0) {
            updateParams.removeParents = toRemove.join(",");
          }
          await drive.files.update(updateParams);
        } catch (driveErr: any) {
          console.warn("[moveItems] Drive move warning:", driveErr?.message || driveErr);
        }
      }

      fileMeta.parents = [destFolder];
      fileMeta.lastSyncedAt = new Date();
      await fileMeta.save();
      movedCount++;
    }

    res.json({
      success: true,
      message: `Successfully moved ${movedCount} item${movedCount === 1 ? "" : "s"}.`,
      movedCount,
      targetFolderId: destFolder,
    });
  } catch (error) {
    console.error("[DriveController] moveItems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to move items.",
      error: (error as Error).message,
    });
  }
};

export const copyItems = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fileIds, targetFolderId } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ success: false, message: "No items specified to copy." });
      return;
    }

    const destFolder = (targetFolderId as string)?.trim() || getRootFolderId();
    let totalCopied = 0;

    for (const fileId of fileIds) {
      const copiedIds = await copyItemRecursively(fileId, destFolder);
      if (copiedIds.length > 0) totalCopied++;
    }

    res.json({
      success: true,
      message: `Successfully copied ${totalCopied} item${totalCopied === 1 ? "" : "s"}.`,
      copiedCount: totalCopied,
      targetFolderId: destFolder,
    });
  } catch (error) {
    console.error("[DriveController] copyItems error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to copy items.",
      error: (error as Error).message,
    });
  }
};

export const createFile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, content = "", parentId } = req.body;
    const cleanName = (name as string)?.trim().replace(/[\/\\:*?"<>|]/g, "_");
    if (!cleanName) {
      res.status(400).json({ success: false, message: "Valid file name is required." });
      return;
    }

    const targetParentId =
      parentId && parentId !== "root" ? parentId : getRootFolderId();
    const mimeType = getMimeTypeFromName(cleanName);
    const buffer = Buffer.from(content, "utf8");

    let createdFile: any = null;

    if (isGoogleDriveConfigured()) {
      try {
        const fileMetadata: any = {
          name: cleanName,
        };
        if (targetParentId && targetParentId !== "root") {
          fileMetadata.parents = [targetParentId];
        }

        const bufferStream = new PassThrough();
        bufferStream.end(buffer);

        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType,
            body: bufferStream,
          },
          fields: "id, name, parents, mimeType, size",
          supportsAllDrives: true,
        });
        createdFile = response.data;
      } catch (driveErr: any) {
        console.warn(
          "[createFile] Google Drive file creation failed, fallback to local:",
          driveErr?.message || driveErr,
        );
      }
    }

    if (!createdFile) {
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const localId =
        "local_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substr(2, 9);
      const localFilePath = path.join(uploadsDir, localId);
      fs.writeFileSync(localFilePath, buffer);

      createdFile = {
        id: localId,
        name: cleanName,
        mimeType,
        size: buffer.length,
        parents: targetParentId ? [targetParentId] : ["root"],
      };
    }

    const newDoc = await FileMetadata.findOneAndUpdate(
      { driveId: createdFile.id },
      {
        driveId: createdFile.id,
        name: createdFile.name,
        mimeType: createdFile.mimeType || mimeType,
        size: createdFile.size ? parseInt(createdFile.size, 10) : buffer.length,
        parents: createdFile.parents || [targetParentId],
        isFolder: false,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      success: true,
      message: `File "${cleanName}" created successfully.`,
      file: {
        id: newDoc.driveId,
        driveId: newDoc.driveId,
        name: newDoc.name,
        mimeType: newDoc.mimeType,
        size: newDoc.size,
        parents: newDoc.parents,
        isFolder: newDoc.isFolder,
        lastSyncedAt: newDoc.lastSyncedAt,
      },
    });
  } catch (error) {
    console.error("[DriveController] createFile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create file.",
      error: (error as Error).message,
    });
  }
};
