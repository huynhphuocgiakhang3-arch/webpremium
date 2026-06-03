import { Router } from 'express';
import { authMiddleware, authMiddlewareForFreeOps } from '../middleware/authMiddleware.js';
import * as aiController from '../controllers/aiController.js';

const router = Router();

// Use authMiddlewareForFreeOps to bypass IP check for FREE tier
// Controller will handle FREE usage limiting
router.post('/ai-tune', authMiddlewareForFreeOps, aiController.aiTuneWithKeyLimit);


export default router;
