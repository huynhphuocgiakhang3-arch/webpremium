import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';
import * as systemFileController from '../controllers/systemFileController.js';

const router = Router();

router.post('/login', adminController.adminLogin);
router.post('/logout', adminController.adminLogout);

router.get('/keys', adminAuth, adminController.listKeys);
router.post('/keys/generate', adminAuth, adminController.generateKey);
router.delete('/keys/cleanup', adminAuth, adminController.cleanupExpiredKeys);
router.post('/extend-key', adminAuth, adminController.extendKey);
router.put('/keys/:id/toggle', adminAuth, adminController.toggleKey);
router.put('/keys/:id/reset-ip', adminAuth, adminController.resetIp);
router.put('/keys/:id/kick', adminAuth, adminController.kickKey);
router.put('/keys/:id/note', adminAuth, adminController.updateKeyNote);
router.delete('/keys/:id', adminAuth, adminController.deleteKey);

router.get('/logs', adminAuth, adminController.listLogs);
router.get('/config', adminAuth, adminController.getConfig);
router.put('/config', adminAuth, adminController.updateConfig);

// Alias — tương thích /api/admin/system-files
router.get('/system-files', adminAuth, systemFileController.listSystemFiles);
router.post('/system-files', adminAuth, systemFileController.createSystemFile);
router.put('/system-files/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/system-files/:id', adminAuth, systemFileController.deleteSystemFile);
router.get('/files', adminAuth, systemFileController.listSystemFiles);
router.post('/files', adminAuth, systemFileController.createSystemFile);
router.put('/files/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/files/:id', adminAuth, systemFileController.deleteSystemFile);

export default router;
