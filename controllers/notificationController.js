import Notification from '../models/Notification.js';
import { isDatabaseReady } from '../middleware/requireDb.js';

export async function listNotifications(req, res) {
  if (!isDatabaseReady()) return res.json({ success: true, notifications: [] });
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, notifications });
  } catch { res.json({ success: true, notifications: [] }); }
}

export async function createNotification(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'DB chưa sẵn sàng' });
  try {
    const { title, message, type, showOnActivate } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung' });
    const n = await Notification.create({ title: title.trim(), message: message.trim(), type: type || 'info', showOnActivate: showOnActivate !== false });
    res.status(201).json({ success: true, message: 'Đã tạo thông báo!', notification: n });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

export async function updateNotification(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'DB chưa sẵn sàng' });
  try {
    const n = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!n) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, message: 'Đã cập nhật!', notification: n });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

export async function deleteNotification(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'DB chưa sẵn sàng' });
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// Public: activate.php gọi để lấy thông báo active
export async function getActiveNotifications(req, res) {
  if (!isDatabaseReady()) return res.json({ success: true, notifications: [] });
  try {
    const notifications = await Notification.find({ isActive: true, showOnActivate: true })
      .sort({ createdAt: -1 }).limit(3).lean();
    res.json({ success: true, notifications });
  } catch { res.json({ success: true, notifications: [] }); }
}
