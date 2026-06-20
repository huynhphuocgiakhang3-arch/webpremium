import MakeFileTemplate from '../models/MakeFileTemplate.js';
import { isDatabaseReady } from '../middleware/requireDb.js';

// ── ADMIN: Lấy danh sách tất cả template ──
export async function listTemplates(req, res) {
  if (!isDatabaseReady()) return res.json({ success: true, templates: [] });
  try {
    const templates = await MakeFileTemplate.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách template' });
  }
}

// ── ADMIN: Tạo template mới ──
export async function createTemplate(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'Database chưa sẵn sàng' });
  try {
    const { deviceName, deviceType, downloadLink, description } = req.body;
    if (!deviceName?.trim() || !deviceType || !downloadLink?.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu tên thiết bị, loại thiết bị hoặc link tải' });
    }
    if (!['ios', 'android'].includes(deviceType)) {
      return res.status(400).json({ success: false, message: 'deviceType phải là ios hoặc android' });
    }
    const template = await MakeFileTemplate.create({
      deviceName: deviceName.trim(),
      deviceType,
      downloadLink: downloadLink.trim(),
      description: String(description ?? '').trim(),
    });
    res.status(201).json({ success: true, message: 'Đã thêm template thành công!', template });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi thêm template' });
  }
}

// ── ADMIN: Sửa template ──
export async function updateTemplate(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'Database chưa sẵn sàng' });
  try {
    const template = await MakeFileTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Không tìm thấy template' });
    const { deviceName, deviceType, downloadLink, description, isActive } = req.body;
    if (deviceName != null) template.deviceName = String(deviceName).trim();
    if (deviceType != null) template.deviceType = deviceType;
    if (downloadLink != null) template.downloadLink = String(downloadLink).trim();
    if (description != null) template.description = String(description).trim();
    if (isActive != null) template.isActive = Boolean(isActive);
    await template.save();
    res.json({ success: true, message: 'Đã cập nhật template!', template });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật template' });
  }
}

// ── ADMIN: Xóa template ──
export async function deleteTemplate(req, res) {
  if (!isDatabaseReady()) return res.status(503).json({ success: false, message: 'Database chưa sẵn sàng' });
  try {
    const template = await MakeFileTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Không tìm thấy template' });
    res.json({ success: true, message: 'Đã xóa template!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xóa template' });
  }
}

// ── PORTAL: Lấy link file theo tên thiết bị (gọi từ activate.php qua Node) ──
export async function getTemplateByDevice(req, res) {
  if (!isDatabaseReady()) return res.json({ success: false, message: 'Database chưa sẵn sàng' });
  try {
    const { deviceName } = req.query;
    if (!deviceName?.trim()) return res.status(400).json({ success: false, message: 'Thiếu tên thiết bị' });
    const template = await MakeFileTemplate.findOne({
      deviceName: { $regex: new RegExp(`^${deviceName.trim()}$`, 'i') },
      isActive: true,
    }).lean();
    if (!template) return res.json({ success: false, message: 'Chưa có file cho thiết bị này. Liên hệ admin!' });
    res.json({ success: true, downloadLink: template.downloadLink, deviceName: template.deviceName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tìm template' });
  }
}
