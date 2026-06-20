import mongoose from 'mongoose';

const makeFileTemplateSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  deviceType: {
    type: String,
    enum: ['ios', 'android'],
    required: true,
  },
  downloadLink: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('MakeFileTemplate', makeFileTemplateSchema);
