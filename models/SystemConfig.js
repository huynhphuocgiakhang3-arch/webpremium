import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  downloadTitle: {
    type: String,
    default: 'Phần mềm hack VIP',
  },
  downloadLink: {
    type: String,
    default: 'https://example.com/download',
  },
});

export default mongoose.model('SystemConfig', systemConfigSchema);
