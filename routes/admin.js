import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';
import * as systemFileController from '../controllers/systemFileController.js';
import * as makeFileController from '../controllers/makeFileController.js';
import * as notifController from '../controllers/notificationController.js';
import * as logController from '../controllers/adminLogController.js';
import { notifyAdminLogin } from '../services/telegramService.js';

const router = Router();

// Login với Telegram + AdminLog
router.post('/login', async (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || '';
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const success = data?.success === true;
      logController.logAdminEvent(success ? 'login_success' : 'login_fail', ip, ua).catch(() => {});
      notifyAdminLogin(ip, ua, success).catch(() => {});
      return originalJson(data);
    };
    return adminController.adminLogin(req, res, next);
  } catch (e) { next(e); }
});

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

// System files
router.get('/system-files', adminAuth, systemFileController.listSystemFiles);
router.post('/system-files', adminAuth, systemFileController.createSystemFile);
router.put('/system-files/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/system-files/:id', adminAuth, systemFileController.deleteSystemFile);
router.get('/files', adminAuth, systemFileController.listSystemFiles);
router.post('/files', adminAuth, systemFileController.createSystemFile);
router.put('/files/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/files/:id', adminAuth, systemFileController.deleteSystemFile);

// MakeFile Templates
router.get('/makefile-templates', adminAuth, makeFileController.listTemplates);
router.post('/makefile-templates', adminAuth, makeFileController.createTemplate);
router.put('/makefile-templates/:id', adminAuth, makeFileController.updateTemplate);
router.delete('/makefile-templates/:id', adminAuth, makeFileController.deleteTemplate);

// Notifications
router.get('/notifications', adminAuth, notifController.listNotifications);
router.post('/notifications', adminAuth, notifController.createNotification);
router.put('/notifications/:id', adminAuth, notifController.updateNotification);
router.delete('/notifications/:id', adminAuth, notifController.deleteNotification);

// Admin Login History
router.get('/admin-logs', adminAuth, logController.listAdminLogs);
router.delete('/admin-logs/clear', adminAuth, logController.clearAdminLogs);

export default router;
