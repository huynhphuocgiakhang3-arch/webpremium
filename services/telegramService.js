// Telegram notification service
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch {}
}

export async function notifyKeyActivated(keyString, keyType, ip, deviceInfo = '') {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const msg = `🔑 <b>KEY MỚI KÍCH HOẠT</b>\n\n` +
    `📌 Key: <code>${keyString}</code>\n` +
    `👑 Loại: <b>${keyType}</b>\n` +
    `🌐 IP: <code>${ip}</code>\n` +
    `📱 Thiết bị: ${deviceInfo || 'Không rõ'}\n` +
    `🕐 Thời gian: ${time}`;
  await sendTelegram(msg);
}

export async function notifyAdminLogin(ip, userAgent, success) {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const icon = success ? '✅' : '⚠️';
  const status = success ? 'THÀNH CÔNG' : 'THẤT BẠI';
  const msg = `${icon} <b>ĐĂNG NHẬP ADMIN ${status}</b>\n\n` +
    `🌐 IP: <code>${ip}</code>\n` +
    `💻 Trình duyệt: ${userAgent?.substring(0, 80) || 'Không rõ'}\n` +
    `🕐 Thời gian: ${time}`;
  await sendTelegram(msg);
}
