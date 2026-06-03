import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/login', authMiddleware, authController.login);

export default router;
