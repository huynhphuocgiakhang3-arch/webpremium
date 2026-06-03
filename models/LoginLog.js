import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  keyUsed: {
    type: String,
    default: 'ADMIN',
  },
  ipAddress: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'success',
      'failed_ip',
      'failed_expired',
      'failed_banned',
      'invalid_key',
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('LoginLog', loginLogSchema);
