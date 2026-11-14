const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  createdAt: { type: Date, default: Date.now },
  device: { type: String, default: 'desktop' }, // desktop | mobile | tablet
  browser: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  country: { type: String, default: 'Unknown' }, // ISO-3166 alpha-2 or Unknown
  referrer: { type: String, default: 'Direct' }, // hostname or Direct
  visitor: { type: String }, // salted hash of ip+ua, used for unique counts (no raw IPs stored)
});

clickSchema.index({ link: 1, createdAt: -1 });

module.exports = mongoose.model('Click', clickSchema);
