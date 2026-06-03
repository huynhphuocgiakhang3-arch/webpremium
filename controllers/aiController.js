/**
 * Ép giá trị độ nhạy luôn nằm trong dải an toàn 40% – 60%.
 */
function clampSensitivity(value) {
  return Math.min(60, Math.max(40, Math.round(value * 10) / 10));
}

/** Bản đồ offset theo tình trạng lỗi OB53 (multi-select) */
const CONDITION_OFFSETS = {
  nang_tam: -2,
  lo_dau: 3,
  rung_tam: -1.5,
  giat_tam: 2.5,
  lac_dan: -3,
  kho_keo: -4,
};

/**
 * Heuristic OB53 — điều chỉnh base theo thiết bị, Hz, tình trạng đã chọn.
 */
function computeHeuristicSensitivities(
  deviceModel,
  dpi,
  screenRefreshRate,
  playStyle,
  conditions = []
) {
  let base = 50;

  const dpiNum = Number(dpi) || 400;
  if (dpiNum >= 1600) base -= 5;
  else if (dpiNum >= 800) base -= 3;
  else if (dpiNum <= 300) base += 3;

  const hz = Number(screenRefreshRate) || 60;
  if (hz >= 144) base += 2;
  else if (hz >= 120) base += 1;
  else if (hz <= 60) base -= 1;

  if (playStyle === 'rusher') base += 4;
  else if (playStyle === 'sniper') base -= 5;

  const model = String(deviceModel || '').toLowerCase();
  let modelOffset = 0;
  for (let i = 0; i < model.length; i++) {
    modelOffset += model.charCodeAt(i);
  }
  base += (modelOffset % 5) - 2;

  if (Array.isArray(conditions)) {
    for (const c of conditions) {
      if (CONDITION_OFFSETS[c] != null) base += CONDITION_OFFSETS[c];
    }
  }

  const general = clampSensitivity(base);
  const redDot = clampSensitivity(base + 1.5);
  const scope2x = clampSensitivity(base - 2);
  const scope4x = clampSensitivity(base - 4);
  const sniperScope = clampSensitivity(base - 5.5);
  const fireButtonSize = clampSensitivity(48 + (base - 50) * 0.15);

  return { general, redDot, scope2x, scope4x, sniperScope, fireButtonSize };
}

export { computeHeuristicSensitivities };

export async function aiTune(req, res) {
  try {
    const {
      deviceModel,
      dpi,
      screenRefreshRate,
      playStyle,
      conditions,
    } = req.body;

    if (!deviceModel) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số deviceModel',
      });
    }

    const dpiVal = dpi != null ? Number(dpi) : 400;
    const hzVal = screenRefreshRate != null ? Number(screenRefreshRate) : 120;
    const style = playStyle === 'sniper' ? 'sniper' : 'rusher';

    const result = computeHeuristicSensitivities(
      deviceModel,
      dpiVal,
      hzVal,
      style,
      conditions
    );

    return res.json({
      success: true,
      version: 'OB53',
      ...result,
    });
  } catch (err) {
    console.error('[aiController.aiTune]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi tính toán độ nhạy AI',
    });
  }
}

/** FREE: tối đa 1 lần — VIP: không giới hạn */
export async function aiTuneWithKeyLimit(req, res) {
  try {
    const keyDoc = req.key;
    if (!keyDoc) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực key' });
    }

    const count = keyDoc.sensitivityAdjustCount ?? 0;
    if (keyDoc.keyType === 'FREE' && count >= 1) {
      return res.status(403).json({
        success: false,
        code: 'FREE_SENSITIVITY_LIMIT',
        message:
          'Thông báo: Tài khoản Free chỉ được tinh chỉnh độ nhạy 1 lần duy nhất! Bạn cần mua Key VIP để tiếp tục sử dụng tính năng này.',
        sensitivityAdjustCount: count,
      });
    }

    const {
      deviceModel,
      dpi,
      screenRefreshRate,
      playStyle,
      conditions,
    } = req.body;

    if (!deviceModel) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số deviceModel',
      });
    }

    const dpiVal = dpi != null ? Number(dpi) : 400;
    const hzVal = screenRefreshRate != null ? Number(screenRefreshRate) : 120;
    const style = playStyle === 'sniper' ? 'sniper' : 'rusher';

    const result = computeHeuristicSensitivities(
      deviceModel,
      dpiVal,
      hzVal,
      style,
      conditions
    );

    if (keyDoc.keyType === 'FREE') {
      keyDoc.sensitivityAdjustCount = count + 1;
      await keyDoc.save();
    }

    return res.json({
      success: true,
      version: 'OB53',
      keyType: keyDoc.keyType,
      sensitivityAdjustCount: keyDoc.sensitivityAdjustCount ?? 0,
      ...result,
    });
  } catch (err) {
    console.error('[aiController.aiTuneWithKeyLimit]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi tính toán độ nhạy AI',
    });
  }
}
