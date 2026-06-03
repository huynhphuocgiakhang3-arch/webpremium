import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Ưu tiên .env dự án
dotenv.config({ path: path.join(projectRoot, '.env'), override: true });

function warnIfUriNeedsEncoding(uri) {
  if (!uri || !uri.includes('@')) return;

  const authPart = uri
    .replace(/^mongodb(?:\+srv)?:\/\//, '')
    .split('@')[0];

  if (!authPart.includes(':')) return;
  const [, password] = authPart.split(/:(.+)/);
  const unsafe = /[\s"#%<>\\^`{|}]/;
  if (unsafe.test(password)) {
    console.warn(
      '[DB] Cảnh báo: MONGODB URI có thể chứa ký tự đặc biệt trong password.',
      'Hãy URL-encode USER/PASS.'
    );
  }
}

const RECONNECT_MS = 12_000;
let reconnectTimer = null;
let onConnectedHook = null;
let lastConnectMode = 'unknown';

export function resolveMongoUri() {
  const uri = process.env.MONGODB_URI?.trim() || '';
  warnIfUriNeedsEncoding(uri);
  return uri;
}

export function maskMongoUri(uri) {
  if (!uri) return '(empty)';
  return uri.replace(/:([^@/]+)@/, ':****@');
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export function getLastConnectMode() {
  return lastConnectMode;
}

export function setOnDatabaseConnected(fn) {
  onConnectedHook = fn;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log('[DB] Thử kết nối lại MongoDB...');
    connectDatabase();
  }, RECONNECT_MS);
}

export async function connectDatabase() {
  if (isDatabaseReady()) return true;

  const uri = resolveMongoUri();
  if (!uri) {
    lastConnectMode = 'missing';
    console.error('[DB] LỖI NGHIÊM TRỌNG: Thiếu MONGODB_URI trong .env');
    scheduleReconnect();
    return false;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }

    console.log(`[DB] Đang kết nối tới Atlas:`, maskMongoUri(uri));

    // Thêm các tuỳ chọn kết nối để tối ưu cho Atlas
    const options = {
      serverSelectionTimeoutMS: 10000, // Tăng timeout để tránh lỗi DNS delay
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(uri, options);

    lastConnectMode = 'Atlas';
    console.log('[DB] ✓ Connected to MongoDB Atlas');
    console.log(
      '       | Host:', mongoose.connection.host,
      '| DB:', mongoose.connection.name
    );

    if (onConnectedHook) {
      await onConnectedHook();
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    return true;

  } catch (err) {
    console.error('\n==================== [DB ERROR DETAILS] ====================');
    console.error('[DB] ✗ Kết nối thất bại tới URI:', maskMongoUri(uri));
    console.error('[DB] Name:', err.name);
    console.error('[DB] Message:', err.message);
    
    // In chi tiết nguyên nhân (đặc biệt hữu ích cho lỗi DNS / querySrv)
    if (err.cause) {
      console.error('[DB] Cause:', err.cause);
    }
    
    // Stack trace để debug sâu
    console.error('[DB] StackTrace:\n', err.stack);
    console.error('============================================================\n');

    console.warn('[DB] Không thể kết nối. Sẽ thử lại sau', RECONNECT_MS / 1000, 'giây...');
    scheduleReconnect();
    return false;
  }
}

export function setupDatabaseConnectionEvents() {
  mongoose.connection.on('connected', () => {
    console.log('[DB] Sự kiện: connected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Sự kiện: disconnected — mất kết nối.');
    scheduleReconnect();
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] Sự kiện error:', err.message);
  });
}
