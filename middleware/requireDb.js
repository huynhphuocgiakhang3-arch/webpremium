import { isDatabaseReady } from '../config/db.js';

export { isDatabaseReady };

/**
 * Chặn API cần DB khi chưa kết nối được MongoDB.
 */
export function requireDatabase(req, res, next) {
  const offline =
    process.env.OFFLINE_NO_DB === '1' || process.env.OFFLINE_NO_DB === 'true';
  if (offline) return next();
  if (!isDatabaseReady()) {
    return res.status(503).json({
      success: false,
      message: 'Dịch vụ tạm thời gián đoạn do lỗi Database',
      hint:
        'Kiểm tra MONGODB_URI (hoặc MONGO_URI) trong .env, đảm bảo MongoDB/Atlas đang chạy, rồi khởi động lại: npm run start',
      database: 'disconnected',
    });
  }
  next();
}
