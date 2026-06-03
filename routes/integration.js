import { Router } from 'express';
import * as integrationController from '../controllers/integrationController.js';
import * as systemFileController from '../controllers/systemFileController.js';
import { authMiddleware, authMiddlewareForFreeOps } from '../middleware/authMiddleware.js';
import * as aiController from '../controllers/aiController.js';

const router = Router();
const OFFLINE_NO_DB =
  process.env.OFFLINE_NO_DB === '1' || process.env.OFFLINE_NO_DB === 'true';

/**
 * Tuyến công khai cho web PHP ngoài (activate.php local).
 * POST /api/integration/verify-key
 * Body: { key, client_ip }
 */
router.post('/verify-key', integrationController.verifyKey);
router.post('/check-session', integrationController.checkSession);
router.get('/system-files', systemFileController.listSystemFilesPortal);
router.get('/cheathack-files', systemFileController.listSystemFilesPortal);
if (!OFFLINE_NO_DB) {
  router.post('/ai-tune', authMiddlewareForFreeOps, aiController.aiTuneWithKeyLimit);
}

export default router;
