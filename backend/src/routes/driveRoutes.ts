import { Router } from 'express';
import multer from 'multer';
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
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all /api/drive/* endpoints
router.use(authMiddleware);

router.get('/stats', getVaultStats);
router.get('/files', getFiles);
router.post('/sync', syncDrive);
router.get('/download/:fileId', downloadFile);
router.get('/view/:fileId', viewFile);
router.get('/content/:fileId', getFileTextContent);
router.post('/folder', createFolder);
router.post('/upload', upload.array('files'), uploadFiles);
router.delete('/file/:fileId', deleteFile);
router.post('/batch-delete', batchDeleteFiles);
router.post('/rename', renameItem);
router.post('/move', moveItems);
router.post('/copy', copyItems);
router.post('/create-file', createFile);

export default router;
