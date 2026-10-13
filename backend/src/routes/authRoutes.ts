import { Router } from 'express';
import { login, getMe, recordActivity } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/activity', authMiddleware, recordActivity);

export default router;
