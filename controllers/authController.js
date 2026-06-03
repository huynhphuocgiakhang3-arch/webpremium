import SystemConfig from '../models/SystemConfig.js';
import { getRemainingTime } from '../services/keyAuthService.js';

/**
 * Đăng nhập Client — middleware đã xử lý IP binding & kích hoạt.
 */
export async function login(req, res) {
  try {
    const keyDoc = req.key;
    const { daysLeft, msRemaining, expiredAt } = getRemainingTime(keyDoc);

    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      key: keyDoc.keyString,
      keyType: keyDoc.keyType || 'VIP',
      status: keyDoc.status,
      isActivated: keyDoc.isActivated,
      activatedAt: keyDoc.activatedAt,
      expiredAt: keyDoc.expiredAt,
      daysLeft,
      msRemaining,
      durationDays: keyDoc.durationDays,
      boundIP: keyDoc.boundIP,
      downloadTitle: config.downloadTitle,
      downloadLink: config.downloadLink,
    });
  } catch (err) {
    console.error('[authController.login]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập',
    });
  }
}
