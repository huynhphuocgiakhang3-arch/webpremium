import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import integrationRoutes from './routes/integration.js';
import fileRoutes from './routes/files.js';
import cheathackRoutes from './routes/cheathack.js';
import SystemConfig from './models/SystemConfig.js';
import { requireDatabase, isDatabaseReady } from './middleware/requireDb.js';
import {
  connectDatabase,
  setupDatabaseConnectionEvents,
  setOnDatabaseConnected,
  resolveMongoUri,
  getLastConnectMode,
  maskMongoUri,
} from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 3000;

const OFFLINE_NO_DB =
  process.env.OFFLINE_NO_DB === '1' || process.env.OFFLINE_NO_DB === 'true';

const PHP_ORIGIN = process.env.PHP_ORIGIN || 'http://127.0.0.1:8080';

// CRITICAL: Đọc IP thật khi deploy sau reverse proxy
app.set('trust proxy', true);

/**
 * CORS đầy đủ: cho phép mọi origin (fetch từ PHP / trình duyệt)
 * + ưu tiên whitelist domain activate.php local.
 * curl/server-side PHP thường không gửi header Origin → luôn cho qua.
 */
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const whitelist = [
      PHP_ORIGIN,
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
    ];
    if (whitelist.includes(origin)) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'X-Requested-With',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug Network Middleware
app.use((req, res, next) => {
  console.log(`[Network] Received request from: ${req.headers.origin || 'unknown'} to ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));

app.get('/api/health', (req, res) => {
  const ready = isDatabaseReady();
  res.json({
    success: true,
    database: OFFLINE_NO_DB ? 'disabled' : ready ? 'connected' : 'disconnected',
    connectMode: OFFLINE_NO_DB ? 'offline' : getLastConnectMode(),
    mongoUri: OFFLINE_NO_DB ? '(disabled)' : maskMongoUri(resolveMongoUri()),
    phpPortal: 'http://127.0.0.1:8080/activate.php',
    phpIntegration: `${PHP_ORIGIN}/activate.php`,
    verifyEndpoint: '/api/integration/verify-key',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/files', fileRoutes);
app.use('/api/cheathack', cheathackRoutes);

app.use('/api/integration', integrationRoutes);
if (!OFFLINE_NO_DB) {
  app.use('/api', requireDatabase);
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/admin', adminRoutes);
} else {
  app.use('/api', (req, res) => {
    res.status(503).json({
      success: false,
      offline: true,
      message: 'Chế độ Offline đang bật: API cần Database đã tắt.',
    });
  });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên' });
});

app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ',
  });
});

async function ensureSystemConfig() {
  if (!isDatabaseReady()) return;
  try {
    const existing = await SystemConfig.findOne();
    if (!existing) {
      await SystemConfig.create({});
      console.log('[DB] Đã khởi tạo SystemConfig mặc định');
    }
    const { ensureDefaultSystemFiles } = await import('./config/seedSystemFiles.js');
    await ensureDefaultSystemFiles();
  } catch (err) {
    console.error('[DB] Lỗi khởi tạo SystemConfig:', err.message);
  }
}

if (!OFFLINE_NO_DB) {
  setupDatabaseConnectionEvents();
  setOnDatabaseConnected(ensureSystemConfig);
}

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.warn('[Server] Thiếu JWT_SECRET trong .env');
  }

  if (!OFFLINE_NO_DB) {
    console.log('[DB] URI cấu hình:', maskMongoUri(resolveMongoUri()));
    console.log('[DB] Đang kết nối tới Atlas...');

    const ok = await connectDatabase();
    if (!ok) {
      console.warn('[DB] Chưa kết nối — Admin/API DB sẽ báo 503 cho đến khi MongoDB sẵn sàng.');
    }
  }

  app.listen(PORT, () => {
    console.log(`[Server] http://127.0.0.1:${PORT}`);
    console.log(`[Admin] http://127.0.0.1:${PORT}/admin`);
    console.log(`[Health] http://127.0.0.1:${PORT}/api/health`);
    console.log(`[PHP]  http://127.0.0.1:8080/activate.php`);
    if (OFFLINE_NO_DB) {
      console.log('[DB]   Trạng thái: disabled (OFFLINE_NO_DB=1)');
    }
  });
}

startServer();
