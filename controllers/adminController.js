import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Key from '../models/Key.js';
import LoginLog from '../models/LoginLog.js';
import SystemConfig from '../models/SystemConfig.js';

const ALLOWED_DURATIONS = [1, 15, 30, 365];
const ALLOWED_KEY_TYPES = ['FREE', 'VIP'];
const CUSTOM_KEY_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;

/** Sinh mã ngẫu nhiên theo loại FREE / VIP */
function generateRandomKeyString(keyType) {
  const segment = () =>
    crypto.randomBytes(2).toString('hex').toUpperCase();
  const prefix = keyType === 'FREE' ? 'FREE' : 'VIP';
  return `${prefix}-${segment()}-${segment()}`;
}

export async function adminLogin(req, res) {
  try {
    const { password } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu admin không đúng',
      });
    }

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    await LoginLog.create({
      keyUsed: 'ADMIN',
      ipAddress: req.ip || 'admin',
      status: 'success',
    });

    return res.json({
      success: true,
      message: 'Đăng nhập admin thành công',
      token,
    });
  } catch (err) {
    console.error('[adminController.adminLogin]', err);
    res.status(500).json({ success: false, message: 'Lỗi đăng nhập admin' });
  }
}

export async function adminLogout(req, res) {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Đã đăng xuất' });
}

export async function listKeys(req, res) {
  try {
    const keys = await Key.find().sort({ createdAt: -1 });
    res.json({ success: true, keys });
  } catch (err) {
    console.error('[adminController.listKeys]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách key' });
  }
}

/**
 * Tạo Key: tên tùy chỉnh (customKeyName) hoặc tự sinh; loại FREE/VIP; thời hạn ngày.
 */
export async function generateKey(req, res) {
  try {
    const {
      durationDays,
      keyType,
      customKeyName,
      keyString: keyStringBody,
    } = req.body;

    const days = parseInt(String(durationDays ?? ''), 10);
    const type = (keyType || 'VIP').toUpperCase();

    if (!Number.isFinite(days) || !ALLOWED_DURATIONS.includes(days)) {
      return res.status(400).json({
        success: false,
        message: 'durationDays phải là 1, 15, 30 hoặc 365',
      });
    }

    if (!ALLOWED_KEY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'keyType phải là FREE hoặc VIP',
      });
    }

    const customInput = (customKeyName ?? keyStringBody ?? '').trim();
    let keyString;

    if (customInput) {
      if (!CUSTOM_KEY_PATTERN.test(customInput)) {
        return res.status(400).json({
          success: false,
          message:
            'Tên key tùy chỉnh chỉ gồm chữ, số, gạch ngang/dưới (3–64 ký tự)',
        });
      }
      const exists = await Key.findOne({ keyString: customInput });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'Key này đã tồn tại trong hệ thống',
        });
      }
      keyString = customInput;
    } else {
      let attempts = 0;
      do {
        keyString = generateRandomKeyString(type);
        const exists = await Key.findOne({ keyString });
        if (!exists) break;
        attempts++;
      } while (attempts < 25);
    }

    const newKey = await Key.create({
      keyString,
      keyType: type,
      durationDays: days,
      status: 'active',
      isActivated: false,
      boundIP: null,
      activatedAt: null,
      expiredAt: null,
    });

    res.status(201).json({ success: true, key: newKey });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Key trùng lặp, vui lòng chọn tên khác',
      });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message || 'Dữ liệu key không hợp lệ',
      });
    }
    console.error('[adminController.generateKey]', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo key' });
  }
}

export async function toggleKey(req, res) {
  try {
    const keyDoc = await Key.findById(req.params.id);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }
    const wasActive = keyDoc.status === 'active';
    keyDoc.status = wasActive ? 'banned' : 'active';
    if (wasActive) {
      keyDoc.isLoggedIn = false;
      keyDoc.sessionVersion = (keyDoc.sessionVersion ?? 0) + 1;
    }
    await keyDoc.save();
    res.json({ success: true, key: keyDoc });
  } catch (err) {
    console.error('[adminController.toggleKey]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái' });
  }
}

export async function resetIp(req, res) {
  try {
    const keyDoc = await Key.findById(req.params.id);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }
    keyDoc.boundIP = null;
    await keyDoc.save();
    res.json({
      success: true,
      key: keyDoc,
      message: 'Đã reset IP — lần đăng nhập sau (PHP/Client) sẽ khóa IP mới',
    });
  } catch (err) {
    console.error('[adminController.resetIp]', err);
    res.status(500).json({ success: false, message: 'Lỗi reset IP' });
  }
}

/**
 * Kick ngay lập tức — hủy phiên Client, reset IP, tăng sessionVersion.
 */
export async function kickKey(req, res) {
  try {
    const keyDoc = await Key.findById(req.params.id);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }
    keyDoc.isLoggedIn = false;
    keyDoc.boundIP = null;
    keyDoc.sessionVersion = (keyDoc.sessionVersion ?? 0) + 1;
    await keyDoc.save();
    res.json({
      success: true,
      key: keyDoc,
      message: 'Đã Kick — Client sẽ bị đẩy ra màn hình khóa trong lần check tiếp theo',
    });
  } catch (err) {
    console.error('[adminController.kickKey]', err);
    res.status(500).json({ success: false, message: 'Lỗi Kick key' });
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Gia hạn nhanh — cộng ngày vào expiredAt (từ hiện tại nếu đã hết hạn, else từ mốc cũ).
 * Body: { keyId, daysToAdd }
 */
export async function extendKey(req, res) {
  try {
    const keyId = req.body.keyId ?? req.body.key_id;
    const daysToAdd = Number(req.body.daysToAdd ?? req.body.days_to_add);

    if (!keyId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu keyId',
      });
    }

    if (!Number.isFinite(daysToAdd) || daysToAdd < 1 || daysToAdd > 3650) {
      return res.status(400).json({
        success: false,
        message: 'daysToAdd phải là số ngày hợp lệ (1–3650)',
      });
    }

    const keyDoc = await Key.findById(keyId);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }

    const now = Date.now();
    let baseMs = now;

    if (keyDoc.expiredAt) {
      const currentExpiry = new Date(keyDoc.expiredAt).getTime();
      if (currentExpiry > now) {
        baseMs = currentExpiry;
      }
    }

    keyDoc.expiredAt = new Date(baseMs + daysToAdd * MS_PER_DAY);
    if (!keyDoc.isActivated) {
      keyDoc.isActivated = true;
      keyDoc.activatedAt = keyDoc.activatedAt ?? new Date();
    }
    await keyDoc.save();

    return res.json({
      success: true,
      message: `Đã cộng ${daysToAdd} ngày cho key`,
      key: keyDoc,
      expiredAt: keyDoc.expiredAt.toISOString(),
      daysAdded: daysToAdd,
    });
  } catch (err) {
    console.error('[adminController.extendKey]', err);
    res.status(500).json({ success: false, message: 'Lỗi gia hạn key' });
  }
}

export async function updateKeyNote(req, res) {
  try {
    const keyDoc = await Key.findById(req.params.id);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }
    const note = String(req.body.adminNote ?? '').trim().slice(0, 200);
    keyDoc.adminNote = note;
    await keyDoc.save();
    res.json({ success: true, key: keyDoc });
  } catch (err) {
    console.error('[adminController.updateKeyNote]', err);
    res.status(500).json({ success: false, message: 'Lỗi lưu ghi chú' });
  }
}

export async function deleteKey(req, res) {
  try {
    const keyDoc = await Key.findByIdAndDelete(req.params.id);
    if (!keyDoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy key' });
    }
    res.json({ success: true, message: 'Đã xóa key' });
  } catch (err) {
    console.error('[adminController.deleteKey]', err);
    res.status(500).json({ success: false, message: 'Lỗi xóa key' });
  }
}

export async function cleanupExpiredKeys(req, res) {
  try {
    const result = await Key.deleteMany({
      expiredAt: { $lt: new Date() }
    });
    res.json({ 
      success: true, 
      message: `Đã dọn dẹp ${result.deletedCount} key hết hạn!` 
    });
  } catch (err) {
    console.error('[adminController.cleanupExpiredKeys]', err);
    res.status(500).json({ success: false, message: 'Lỗi dọn dẹp hệ thống' });
  }
}

export async function listLogs(req, res) {
  try {
    const logs = await LoginLog.find()
      .sort({ timestamp: -1 })
      .limit(200);
    res.json({ success: true, logs });
  } catch (err) {
    console.error('[adminController.listLogs]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải log' });
  }
}

export async function getConfig(req, res) {
  try {
    let config = await SystemConfig.findOne();
    if (!config) config = await SystemConfig.create({});
    res.json({ success: true, config });
  } catch (err) {
    console.error('[adminController.getConfig]', err);
    res.status(500).json({ success: false, message: 'Lỗi đọc cấu hình' });
  }
}

export async function updateConfig(req, res) {
  try {
    const { downloadTitle, downloadLink } = req.body;
    let config = await SystemConfig.findOne();
    if (!config) config = new SystemConfig();
    if (downloadTitle != null) config.downloadTitle = downloadTitle;
    if (downloadLink != null) config.downloadLink = downloadLink;
    await config.save();
    res.json({ success: true, config });
  } catch (err) {
    console.error('[adminController.updateConfig]', err);
    res.status(500).json({ success: false, message: 'Lỗi lưu cấu hình' });
  }
}
