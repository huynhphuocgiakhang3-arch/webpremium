import Key from '../models/Key.js';
import LoginLog from '../models/LoginLog.js';

/**
 * Ghi log đăng nhập vào hệ thống.
 */
async function writeLoginLog(keyUsed, ipAddress, status) {
  try {
    await LoginLog.create({ keyUsed, ipAddress, status });
  } catch (err) {
    console.error('[LoginLog] Lỗi ghi log:', err.message);
  }
}

/**
 * Logic xác thực Key + IP Binding + kích hoạt thời gian lần đầu.
 * Dùng chung cho Client (middleware) và tích hợp PHP (client_ip từ body).
 *
 * Cơ chế kích hoạt: expiredAt CHỈ được set tại giây đầu tiên đăng nhập thành công.
 */
export async function validateKeyWithIp(keyString, clientIp) {
  if (!keyString) {
    return {
      ok: false,
      httpStatus: 401,
      logStatus: 'invalid_key',
      message: 'Thiếu mã key',
      keyObj: null,
    };
  }

  const ip = clientIp || 'unknown';
  const keyDoc = await Key.findOne({ keyString: keyString.trim() });

  if (!keyDoc) {
    await writeLoginLog(keyString, ip, 'invalid_key');
    return {
      ok: false,
      httpStatus: 404,
      logStatus: 'invalid_key',
      message: 'Mã key không tồn tại',
      keyObj: null,
    };
  }

  if (keyDoc.status === 'banned') {
    await writeLoginLog(keyString, ip, 'failed_banned');
    return {
      ok: false,
      httpStatus: 403,
      logStatus: 'failed_banned',
      message: 'Key đã bị khóa (banned)',
      keyObj: null,
    };
  }

  // Key đã từng kích hoạt — kiểm tra hết hạn trước khi so IP
  if (keyDoc.isActivated && keyDoc.expiredAt) {
    if (Date.now() > new Date(keyDoc.expiredAt).getTime()) {
      await writeLoginLog(keyString, ip, 'failed_expired');
      return {
        ok: false,
        httpStatus: 403,
        logStatus: 'failed_expired',
        message: 'Key đã hết hạn sử dụng',
        keyObj: null,
      };
    }
  }

  // Liên kết IP với web PHP ngoài / Client: lần đầu ghi client_ip vào boundIP
  if (keyDoc.boundIP === null) {
    const now = new Date();
    keyDoc.boundIP = ip;
    if (!keyDoc.isActivated) {
      keyDoc.isActivated = true;
      keyDoc.activatedAt = now;
      const msPerDay = 24 * 60 * 60 * 1000;
      keyDoc.expiredAt = new Date(
        now.getTime() + keyDoc.durationDays * msPerDay
      );
    }
    keyDoc.isLoggedIn = true;
    await keyDoc.save();
    await writeLoginLog(keyString, ip, 'success');
    return {
      ok: true,
      httpStatus: 200,
      logStatus: 'success',
      message: 'Xác thực thành công',
      keyObj: keyDoc,
    };
  }

  // Các lần sau: so khớp IP PHP gửi (client_ip) với boundIP đã lưu
  // TRỪ: KEY FREE được phép đổi IP (bypass IP validation để tinh chỉnh mọi lúc)
  if (keyDoc.keyType !== 'FREE' && keyDoc.boundIP !== ip) {
    await writeLoginLog(keyString, ip, 'failed_ip');
    return {
      ok: false,
      httpStatus: 403,
      logStatus: 'failed_ip',
      message: 'IP không khớp với thiết bị đã đăng ký',
      keyObj: null,
    };
  }

  // FREE key được phép từ bất kỳ IP nào (bypass IP binding check)
  if (keyDoc.keyType === 'FREE' && !keyDoc.boundIP) {
    keyDoc.boundIP = ip; // Ghi nhận IP lần đầu tiên
  }


  await writeLoginLog(keyString, ip, 'success');
  keyDoc.isLoggedIn = true;
  await keyDoc.save();
  return {
    ok: true,
    httpStatus: 200,
    logStatus: 'success',
    message: 'Xác thực thành công',
    keyObj: keyDoc,
  };
}

/**
 * Autenticação básica de key para operações sensíveis (ex: tinh chỉnh độ nhạy FREE).
 * NÃO verifica IP binding — deixa o controller lidar com lógica específica.
 * Usado para contas FREE onde IP pode mudar entre operações.
 */
export async function validateKeyBasicOnly(keyString) {
  if (!keyString) {
    return {
      ok: false,
      httpStatus: 401,
      message: 'Thiếu mã key',
      keyObj: null,
    };
  }

  const keyDoc = await Key.findOne({ keyString: keyString.trim() });

  if (!keyDoc) {
    return {
      ok: false,
      httpStatus: 404,
      message: 'Mã key không tồn tại',
      keyObj: null,
    };
  }

  if (keyDoc.status === 'banned') {
    return {
      ok: false,
      httpStatus: 403,
      message: 'Key đã bị khóa (banned)',
      keyObj: null,
    };
  }

  // Cho KEY FREE luôn bypass IP check — FREE được sử dụng từ bất kỳ IP nào
  // Chỉ kiểm tra: tồn tại, không bị ban, không hết hạn
  if (keyDoc.isActivated && keyDoc.expiredAt) {
    if (Date.now() > new Date(keyDoc.expiredAt).getTime()) {
      return {
        ok: false,
        httpStatus: 403,
        message: 'Key đã hết hạn sử dụng',
        keyObj: null,
      };
    }
  }

  return {
    ok: true,
    httpStatus: 200,
    message: 'Key hợp lệ',
    keyObj: keyDoc,
  };
}

export async function validateKeyHeartbeat(
  keyString,
  clientIp,
  sessionVersion
) {
  if (!keyString) {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  const ip = clientIp || 'unknown';
  const keyDoc = await Key.findOne({ keyString: keyString.trim() });

  if (!keyDoc) {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  if (keyDoc.status === 'banned') {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  if (!keyDoc.isLoggedIn) {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  const clientVer = Number(sessionVersion ?? -1);
  const dbVer = keyDoc.sessionVersion ?? 0;
  if (clientVer !== dbVer) {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  if (keyDoc.isActivated && keyDoc.expiredAt) {
    if (Date.now() > new Date(keyDoc.expiredAt).getTime()) {
      return {
        ok: false,
        message: 'Key đã hết hạn sử dụng',
      };
    }
  }

  // FREE keys bypass IP check — VIP keys require IP match
  if (keyDoc.keyType !== 'FREE' && keyDoc.boundIP && ip !== 'unknown' && keyDoc.boundIP !== ip) {
    return {
      ok: false,
      message: 'Key của bạn đã bị Admin khóa hoặc Kick khỏi thiết bị!',
    };
  }

  return { ok: true, keyObj: keyDoc };
}

export function getRemainingTime(keyDoc) {
  if (!keyDoc?.expiredAt) {
    return { daysLeft: keyDoc?.durationDays ?? 0, msRemaining: null };
  }
  const expiredAt = new Date(keyDoc.expiredAt);
  const msRemaining = Math.max(0, expiredAt.getTime() - Date.now());
  const daysLeft = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return { daysLeft, msRemaining, expiredAt };
}
