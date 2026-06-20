import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as notifController from '../controllers/notificationController.js';
import * as logController from '../controllers/adminLogController.js';

const router = Router();

// Notifications - Admin
router.get('/notifications', adminAuth, notifController.listNotifications);
router.post('/notifications', adminAuth, notifController.createNotification);
router.put('/notifications/:id', adminAuth, notifController.updateNotification);
router.delete('/notifications/:id', adminAuth, notifController.deleteNotification);

// Admin logs
router.get('/admin-logs', adminAuth, logController.listAdminLogs);

// Public: activate.php gọi
router.get('/active-notifications', notifController.getActiveNotifications);

export default router;
