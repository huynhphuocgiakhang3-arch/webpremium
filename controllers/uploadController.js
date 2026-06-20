import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MUSIC_DIR = path.join(__dirname, '..', 'public', 'music');
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

// Storage cho file thường
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, '_');
    const unique = Date.now() + '_' + safe;
    cb(null, unique);
  },
});

// Storage cho nhạc
const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MUSIC_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, '_');
    cb(null, Date.now() + '_' + safe);
  },
});

export const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
}).single('file');

export const uploadMusic = multer({
  storage: musicStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.ogg', '.wav', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file nhạc: mp3, ogg, wav, m4a'));
  },
}).single('music');

// Upload file thường (cho system files, cheathack, makefile)
export async function handleFileUpload(req, res) {
  uploadFile(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Chưa chọn file' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.originalname, size: req.file.size });
  });
}

// Upload nhạc
export async function handleMusicUpload(req, res) {
  uploadMusic(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'Chưa chọn file nhạc' });
    const url = `/music/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.originalname });
  });
}

// Lấy danh sách nhạc đã upload
export async function listMusic(req, res) {
  try {
    const files = fs.readdirSync(MUSIC_DIR)
      .filter(f => ['.mp3','.ogg','.wav','.m4a'].includes(path.extname(f).toLowerCase()))
      .map(f => ({ filename: f, url: `/music/${f}`, name: f.replace(/^\d+_/, '') }));
    res.json({ success: true, music: files });
  } catch {
    res.json({ success: true, music: [] });
  }
}

// Xóa file nhạc
export async function deleteMusic(req, res) {
  try {
    const filename = req.params.filename;
    if (filename.includes('..')) return res.status(400).json({ success: false, message: 'Invalid' });
    const filepath = path.join(MUSIC_DIR, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    res.json({ success: true, message: 'Đã xóa nhạc!' });
  } catch {
    res.status(500).json({ success: false, message: 'Lỗi xóa file' });
  }
}

// Lấy/set nhạc đang phát (lưu vào file config)
const MUSIC_CONFIG_PATH = path.join(MUSIC_DIR, '_config.json');

export async function getMusicConfig(req, res) {
  try {
    const cfg = fs.existsSync(MUSIC_CONFIG_PATH)
      ? JSON.parse(fs.readFileSync(MUSIC_CONFIG_PATH, 'utf8'))
      : { current: null, volume: 0.3, autoplay: true, externalUrl: '' };
    res.json({ success: true, ...cfg });
  } catch {
    res.json({ success: true, current: null, volume: 0.3, autoplay: true, externalUrl: '' });
  }
}

export async function setMusicConfig(req, res) {
  try {
    const existing = fs.existsSync(MUSIC_CONFIG_PATH)
      ? JSON.parse(fs.readFileSync(MUSIC_CONFIG_PATH, 'utf8'))
      : {};
    const updated = { ...existing, ...req.body };
    fs.writeFileSync(MUSIC_CONFIG_PATH, JSON.stringify(updated, null, 2));
    res.json({ success: true, message: 'Đã lưu cấu hình nhạc!', ...updated });
  } catch {
    res.status(500).json({ success: false, message: 'Lỗi lưu config' });
  }
}
