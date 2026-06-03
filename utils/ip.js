/**
 * Trích xuất và làm sạch địa chỉ IP từ request (hỗ trợ proxy / local / reverse proxy).
 */
export function extractClientIp(req) {
  const raw =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';
  let ip = String(raw).split(',')[0].trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  return ip || 'unknown';
}

/**
 * Làm sạch chuỗi IP từ bên thứ ba (trang PHP gửi client_ip).
 */
export function normalizeIp(ip) {
  if (!ip) return '';
  let cleaned = String(ip).split(',')[0].trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned;
}
