import { extractClientIp } from '../utils/ip.js';
import { validateKeyWithIp, validateKeyBasicOnly } from '../services/keyAuthService.js';

/**
 * Middleware xác thực Key cho Client / API AI.
 * Đọc key từ header x-api-key hoặc body.key.
 */
export async function authMiddleware(req, res, next) {
  try {
    const keyString =
      req.headers['x-api-key'] ||
      req.body?.key ||
      req.query?.key;

    if (!keyString) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu mã key (x-api-key hoặc body.key)',
      });
    }

    const clientIp = extractClientIp(req);
    const result = await validateKeyWithIp(keyString, clientIp);

    if (!result.ok) {
      return res.status(result.httpStatus).json({
        success: false,
        message: result.message,
        status: result.logStatus,
      });
    }

    req.key = result.keyObj;
    req.clientIp = clientIp;
    next();
  } catch (err) {
    console.error('[authMiddleware]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực hệ thống',
    });
  }
}

/**
 * Middleware xác thực Key cho operações FREE (tinh chỉnh độ nhạy, v.v.).
 * NÃO kiểm tra IP binding — để controller xử lý logic FREE-specific.
 * Điều này cho phép FREE accounts tinh chỉnh ngay cả khi IP thay đổi,
 * nhưng controller sẽ chặn nếu đã vượt quá 1 lần.
 */
export async function authMiddlewareForFreeOps(req, res, next) {
  try {
    const keyString =
      req.headers['x-api-key'] ||
      req.body?.key ||
      req.query?.key;

    if (!keyString) {
      return res.status(401).json({
        success: false,
        message: 'Thiếu mã key (x-api-key hoặc body.key)',
      });
    }

    const clientIp = extractClientIp(req);
    const result = await validateKeyBasicOnly(keyString);

    if (!result.ok) {
      return res.status(result.httpStatus).json({
        success: false,
        message: result.message,
        status: result.logStatus,
      });
    }

    req.key = result.keyObj;
    req.clientIp = clientIp;
    next();
  } catch (err) {
    console.error('[authMiddlewareForFreeOps]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực hệ thống',
    });
  }
}
