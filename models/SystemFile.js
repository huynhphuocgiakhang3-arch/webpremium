import mongoose from 'mongoose';

const systemFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
  badgeType: {
    type: String,
    enum: ['FREE', 'VIP', 'PRO', 'NONE'],
    default: 'NONE',
  },
  uploadDate: {
    type: String,
    required: true,
    trim: true,
  },
  downloadLink: {
    type: String,
    required: true,
    trim: true,
  },
  /** system = Tinh chỉnh hệ thống | cheathack = CheatHack PMT3 */
  category: {
    type: String,
    enum: ['system', 'cheathack'],
    default: 'system',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('SystemFile', systemFileSchema);
