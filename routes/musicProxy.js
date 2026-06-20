import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();
const PHP = 'http://127.0.0.1:8080';

router.get('/', adminAuth, async (req, res) => {
  try {
    const action = req.query.action || 'music_config';
    const r = await fetch(`${PHP}/activate.php?action=${action}`);
    const text = await r.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ success: false, message: 'PHP lỗi: ' + text.substring(0, 100) });
    }
  } catch (e) {
    res.json({ success: false, message: 'Không kết nối PHP: ' + e.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const action = req.query.action || 'music_set';
    const r = await fetch(`${PHP}/activate.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.json({ success: false, message: 'PHP lỗi: ' + text.substring(0, 100) });
    }
  } catch (e) {
    res.json({ success: false, message: 'Không kết nối PHP: ' + e.message });
  }
});

export default router;
