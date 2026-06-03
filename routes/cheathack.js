import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as systemFileController from '../controllers/systemFileController.js';

const router = Router();

router.use((req, _res, next) => {
  req.fileCategory = 'cheathack';
  next();
});

router.get('/', adminAuth, systemFileController.listSystemFiles);
router.post('/', adminAuth, systemFileController.createSystemFile);
router.post('/delete', adminAuth, systemFileController.deleteSystemFilePost);
router.put('/:id', adminAuth, systemFileController.updateSystemFile);
router.delete('/:id', adminAuth, systemFileController.deleteSystemFile);

export default router;
