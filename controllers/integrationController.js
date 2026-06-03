import Key from '../models/Key.js';
import { normalizeIp } from '../utils/ip.js';
import {
  validateKeyWithIp,
  validateKeyHeartbeat,
  getRemainingTime,
} from '../services/keyAuthService.js';

const OFFLINE_NO_DB =
  process.env.OFFLINE_NO_DB === '1' || process.env.OFFLINE_NO_DB === 'true';

/**
 * API công khai cho trang PHP — verify-key + khóa IP.
 */
export async function verifyKey(req, res) {
  try {
    const {
      key,
      client_ip: clientIpRaw,
      heartbeat: heartbeatRaw,
      session_version: sessionVersionRaw,
    } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        status: 'invalid_key',
        message: 'Thiếu tham số key',
        keyType: null,
        expiredAt: null,
      });
    }

    if (!clientIpRaw) {
      return res.status(400).json({
        success: false,
        status: 'invalid_key',
        message: 'Thiếu tham số client_ip',
        keyType: null,
        expiredAt: null,
      });
    }

    const clientIp = normalizeIp(clientIpRaw);
    const isHeartbeat =
      heartbeatRaw === true ||
      heartbeatRaw === 'true' ||
      heartbeatRaw === 1 ||
      sessionVersionRaw !== undefined;

    if (OFFLINE_NO_DB) {
      if (isHeartbeat) {
        return res.json({
          success: true,
          kicked: false,
          keyType: 'VIP',
          expiredAt: null,
          daysLeft: 9999,
          key: String(key).trim(),
          message: 'OFFLINE_NO_DB: heartbeat ok',
          sessionVersion: 0,
          isLoggedIn: true,
          sensitivityAdjustCount: 0,
        });
      }

      return res.json({
        success: true,
        keyType: 'VIP',
        expiredAt: null,
        daysLeft: 9999,
        key: String(key).trim(),
        message: 'OFFLINE_NO_DB: verify ok',
        isActivated: true,
        boundIP: clientIp,
        sessionVersion: 0,
        isLoggedIn: true,
        sensitivityAdjustCount: 0,
      });
    }

    if (isHeartbeat) {
      const hb = await validateKeyHeartbeat(
        String(key).trim(),
        clientIp,
        sessionVersionRaw
      );
      if (!hb.ok) {
        return res.json({
          success: false,
          kicked: true,
          status: 'session_revoked',
          message:
            hb.message ||
            'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
          keyType: null,
          expiredAt: null,
        });
      }
      const keyDoc = hb.keyObj;
      const { daysLeft } = getRemainingTime(keyDoc);
      return res.json({
        success: true,
        kicked: false,
        keyType: keyDoc.keyType || 'VIP',
        expiredAt: keyDoc.expiredAt ? keyDoc.expiredAt.toISOString() : null,
        daysLeft,
        key: keyDoc.keyString,
        message: 'Phiên hợp lệ',
        sessionVersion: keyDoc.sessionVersion ?? 0,
        isLoggedIn: keyDoc.isLoggedIn,
        sensitivityAdjustCount: keyDoc.sensitivityAdjustCount ?? 0,
      });
    }

    const result = await validateKeyWithIp(String(key).trim(), clientIp);

    if (!result.ok) {
      return res.status(result.httpStatus).json({
        success: false,
        status: result.logStatus,
        message: result.message,
        keyType: null,
        expiredAt: null,
      });
    }

    const keyDoc = result.keyObj;
    const { daysLeft } = getRemainingTime(keyDoc);

    return res.json({
      success: true,
      keyType: keyDoc.keyType || 'VIP',
      expiredAt: keyDoc.expiredAt ? keyDoc.expiredAt.toISOString() : null,
      daysLeft,
      key: keyDoc.keyString,
      message: 'Key hợp lệ, đăng nhập thành công!',
      isActivated: keyDoc.isActivated,
      boundIP: keyDoc.boundIP,
      sessionVersion: keyDoc.sessionVersion ?? 0,
      isLoggedIn: keyDoc.isLoggedIn ?? true,
      sensitivityAdjustCount: keyDoc.sensitivityAdjustCount ?? 0,
    });
  } catch (err) {
    console.error('[integrationController.verifyKey]', err);
    res.status(500).json({
      success: false,
      status: 'server_error',
      message: 'Lỗi máy chủ tích hợp',
      keyType: null,
      expiredAt: null,
    });
  }
}

/**
 * Kiểm tra phiên Client PHP còn hợp lệ không (phát hiện Admin Kick).
 */
export async function checkSession(req, res) {
  try {
    const { key, client_ip: clientIpRaw, session_version: sessionVersionRaw } =
      req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        kicked: true,
        message: 'Thiếu key',
      });
    }

    if (OFFLINE_NO_DB) {
      return res.json({
        success: true,
        kicked: false,
        sessionVersion: 0,
        isLoggedIn: true,
        keyType: 'VIP',
        expiredAt: null,
        daysLeft: 9999,
        sensitivityAdjustCount: 0,
      });
    }

    const keyDoc = await Key.findOne({ keyString: String(key).trim() });
    if (!keyDoc) {
      return res.json({
        success: false,
        kicked: true,
        message: 'Key không tồn tại',
      });
    }

    const clientVersion = Number(sessionVersionRaw ?? -1);
    const dbVersion = keyDoc.sessionVersion ?? 0;

    if (
      !keyDoc.isLoggedIn ||
      clientVersion !== dbVersion ||
      keyDoc.status === 'banned'
    ) {
      return res.json({
        success: false,
        kicked: true,
        message: 'Phiên đăng nhập đã bị Admin Kick hoặc Key không còn hợp lệ',
      });
    }

    if (keyDoc.isActivated && keyDoc.expiredAt) {
      if (Date.now() > new Date(keyDoc.expiredAt).getTime()) {
        return res.json({
          success: false,
          kicked: true,
          message: 'Key đã hết hạn',
        });
      }
    }

    const clientIp = normalizeIp(clientIpRaw || '');
    // FREE keys bypass IP check — VIP keys require IP match
    if (keyDoc.keyType !== 'FREE' && keyDoc.boundIP && clientIp && keyDoc.boundIP !== clientIp) {
      return res.json({
        success: false,
        kicked: true,
        message: 'IP không khớp — phiên đã hết hiệu lực',
      });
    }

    const { daysLeft } = getRemainingTime(keyDoc);

    return res.json({
      success: true,
      kicked: false,
      sessionVersion: dbVersion,
      isLoggedIn: keyDoc.isLoggedIn,
      keyType: keyDoc.keyType,
      expiredAt: keyDoc.expiredAt ? keyDoc.expiredAt.toISOString() : null,
      daysLeft,
      sensitivityAdjustCount: keyDoc.sensitivityAdjustCount ?? 0,
    });
  } catch (err) {
    console.error('[integrationController.checkSession]', err);
    res.status(500).json({
      success: false,
      kicked: false,
      message: 'Lỗi kiểm tra phiên',
    });
  }
}
