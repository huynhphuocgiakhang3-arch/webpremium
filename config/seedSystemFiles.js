/**
 * File hệ thống mặc định — đồng bộ vào MongoDB (Local / Atlas / In-Memory).
 * Upsert theo fileName để Admin luôn quản lý được (Sửa/Xóa).
 */
export const DEFAULT_SYSTEM_FILES = [
  {
    category: 'system',
    fileName: 'Deeply tweak the apple system ios',
    description: 'Bộ file can thiệp sâu vào hệ thống apple systems',
    badgeType: 'VIP',
    uploadDate: '31/05/2026',
    downloadLink:
      'https://www.mediafire.com/file/4ma1hfrv4989iez/Apple+Configuration+Modern.zip/file',
  },
  {
    category: 'system',
    fileName: 'Setup UltraView Dynamics ios',
    description: 'Bộ cấu hình UltraView Dynamics tối ưu cho iOS',
    badgeType: 'PRO',
    uploadDate: '31/05/2026',
    downloadLink:
      'https://www.mediafire.com/file/placeholder/UltraView+Dynamics+iOS.zip/file',
  },
];

/** File demo cũ — gỡ khỏi DB khi seed */
const LEGACY_DEMO_FILE_NAMES = [
  'config_mau_huong_dan.ini',
  'OB53_Sensitivity_Default.cfg',
  'iOS_Touch_Optimized.mobileconfig',
];

export async function ensureDefaultSystemFiles() {
  const { default: SystemFile } = await import('../models/SystemFile.js');

  await SystemFile.updateMany(
    { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
    { $set: { category: 'system' } }
  );

  for (const doc of DEFAULT_SYSTEM_FILES) {
    await SystemFile.findOneAndUpdate(
      { fileName: doc.fileName, category: doc.category || 'system' },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const removed = await SystemFile.deleteMany({
    fileName: { $in: LEGACY_DEMO_FILE_NAMES },
  });
  if (removed.deletedCount > 0) {
    console.log(`[DB] Đã gỡ ${removed.deletedCount} file demo cũ khỏi database`);
  }

  console.log(
    '[DB] ✓ File hệ thống:',
    DEFAULT_SYSTEM_FILES.map((f) => f.fileName).join(' | ')
  );
}
