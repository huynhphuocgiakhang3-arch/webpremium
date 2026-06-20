import AdminLog from '../models/AdminLog.js';
import { isDatabaseReady } from '../middleware/requireDb.js';

export async function listAdminLogs(req, res) {
  if (!isDatabaseReady()) return res.json({ success: true, logs: [] });
  try {
    const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, logs });
  } catch { res.json({ success: true, logs: [] }); }
}

export async function clearAdminLogs(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'DB chưa sẵn sàng' });
  try {
    await AdminLog.deleteMany({});
    res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử!' });
  } catch { res.status(500).json({ success: false, message: 'Lỗi xóa' }); }
}

export async function logAdminEvent(event, ip, userAgent, detail = '') {
  if (!isDatabaseReady()) return;
  try {
    await AdminLog.create({ event, ip, userAgent, detail });
  } catch {}
}
