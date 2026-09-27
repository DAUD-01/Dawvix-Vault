import { Router } from 'express';
import {
  getFiles,
  syncDrive,
  downloadFile,
  viewFile,
  getFileTextContent,
  getVaultStats,
} from '../controllers/driveController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all /api/drive/* endpoints
router.use(authMiddleware);

router.get('/stats', getVaultStats);
router.get('/files', getFiles);
router.post('/sync', syncDrive);
router.get('/download/:fileId', downloadFile);
router.get('/view/:fileId', viewFile);
router.get('/content/:fileId', getFileTextContent);

export default router;
