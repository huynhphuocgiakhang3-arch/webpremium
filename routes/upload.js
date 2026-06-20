import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  handleFileUpload,
  handleMusicUpload,
  listMusic,
  deleteMusic,
  getMusicConfig,
  setMusicConfig,
} from '../controllers/uploadController.js';

const router = Router();

// Upload file thường (dùng cho system files / cheathack / makefile)
router.post('/file', adminAuth, handleFileUpload);

// Nhạc
router.post('/music', adminAuth, handleMusicUpload);
router.get('/music', adminAuth, listMusic);
router.delete('/music/:filename', adminAuth, deleteMusic);
router.get('/music-config', getMusicConfig);        // Public — activate.php đọc
router.put('/music-config', adminAuth, setMusicConfig);

export default router;
