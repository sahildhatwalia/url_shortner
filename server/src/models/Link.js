const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true, unique: true }, // the short code / custom alias
    originalUrl: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    clicks: { type: Number, default: 0 },
    lastClickedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

linkSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Link', linkSchema);
