import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as systemFileController from '../controllers/systemFileController.js';

/**
 * Quản lý File Tinh Chỉnh — Admin
 * GET    /api/files
 * POST   /api/files
 * DELETE /api/files/:id
 */
const router = Router();

router.use((req, _res, next) => {
  req.fileCategory = 'system';
  next();
});

router.get('/', adminAuth, systemFileController.listSystemFiles);
router.post('/', adminAuth, systemFileController.createSystemFile);
router.post('/delete', adminAuth, systemFileController.deleteSystemFilePost);
router.put('/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/:id', adminAuth, systemFileController.deleteSystemFile);

export default router;
