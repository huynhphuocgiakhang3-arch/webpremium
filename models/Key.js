import mongoose from 'mongoose';

const keySchema = new mongoose.Schema({
  // Mã bản quyền: tự sinh ngẫu nhiên HOẶC tên do Admin tự đặt (vd: KieuAnhFree, VipPro999)
  keyString: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  // Phân loại cấp độ — dùng cho trang PHP login.php phân quyền FREE/VIP
  keyType: {
    type: String,
    enum: ['FREE', 'VIP'],
    default: 'VIP',
  },
  durationDays: {
    type: Number,
    required: true,
    validate: {
      validator(v) {
        return [1, 15, 30, 365].includes(Number(v));
      },
      message: 'durationDays phải là 1, 15, 30 hoặc 365',
    },
  },
  status: {
    type: String,
    enum: ['active', 'banned'],
    default: 'active',
  },
  boundIP: {
    type: String,
    default: null,
  },
  // Phiên đăng nhập — Admin Kick sẽ reset
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  // Mỗi lần Kick tăng version — Client PHP so khớp để hủy session
  sessionVersion: {
    type: Number,
    default: 0,
  },
  isActivated: {
    type: Boolean,
    default: false,
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  // Hết hạn (MongoDB Date) — tính từ kích hoạt; Admin có thể gia hạn (+ngày)
  expiredAt: {
    type: Date,
    default: null,
  },
  // Ghi chú Admin — nhớ khách hàng / giao dịch
  adminNote: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200,
  },
  /** Số lần tinh chỉnh độ nhạy AI — FREE tối đa 1 */
  sensitivityAdjustCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Key', keySchema);
