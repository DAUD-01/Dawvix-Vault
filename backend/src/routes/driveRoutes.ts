import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {
  getFiles,
  syncDrive,
  downloadFile,
  viewFile,
  getFileTextContent,
  getVaultStats,
  createFolder,
  uploadFiles,
  deleteFile,
  batchDeleteFiles,
  renameItem,
  moveItems,
  copyItems,
  createFile,
} from '../controllers/driveController.js';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
const uploadTempDir = path.resolve(process.cwd(), 'uploads', '.tmp');
fs.mkdirSync(uploadTempDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadTempDir,
  }),
});

// Protect all /api/drive/* endpoints
router.use(authMiddleware);

router.get('/stats', getVaultStats);
router.get('/files', getFiles);
router.post('/sync', requireAdmin, syncDrive);
router.get('/download/:fileId', downloadFile);
router.get('/view/:fileId', viewFile);
router.get('/content/:fileId', getFileTextContent);
router.post('/folder', requireAdmin, createFolder);
router.post('/upload', requireAdmin, upload.array('files'), uploadFiles);
router.delete('/file/:fileId', requireAdmin, deleteFile);
router.post('/batch-delete', requireAdmin, batchDeleteFiles);
router.post('/rename', requireAdmin, renameItem);
router.post('/move', requireAdmin, moveItems);
router.post('/copy', requireAdmin, copyItems);
router.post('/create-file', requireAdmin, createFile);

export default router;
