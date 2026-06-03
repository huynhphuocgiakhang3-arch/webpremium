import jwt from 'jsonwebtoken';

/**
 * Xác thực JWT Admin từ Cookie hoặc Authorization Bearer.
 */
export function adminAuth(req, res, next) {
  try {
    let token =
      req.cookies?.adminToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập admin',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền admin',
      });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên admin không hợp lệ hoặc đã hết hạn',
    });
  }
}
