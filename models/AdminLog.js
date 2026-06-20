import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  event: { type: String, required: true }, // login_success, login_fail, logout, key_activated
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  detail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('AdminLog', adminLogSchema);
