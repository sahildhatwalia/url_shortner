// Demo data: creates demo@linkly.dev / demo1234 with 6 links and ~900 clicks over 30 days.
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('./models/User');
const Link = require('./models/Link');
const Click = require('./models/Click');

const pick = (weighted) => {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of weighted) if ((r -= w) <= 0) return v;
  return weighted[0][0];
};

const devices = [['mobile', 55], ['desktop', 38], ['tablet', 7]];
const browsers = [['Chrome', 50], ['Safari', 25], ['Firefox', 10], ['Edge', 10], ['Samsung Browser', 5]];
const systems = [['Android', 30], ['Windows', 28], ['iOS', 22], ['macOS', 15], ['Linux', 5]];
const countries = [['IN', 30], ['US', 25], ['GB', 10], ['DE', 8], ['CA', 6], ['SG', 5], ['AU', 5], ['BR', 4], ['FR', 4], ['JP', 3]];
const referrers = [['Direct', 30], ['twitter.com', 20], ['linkedin.com', 18], ['google.com', 12], ['github.com', 8], ['reddit.com', 6], ['news.ycombinator.com', 6]];

const links = [
  { code: 'portfolio', title: 'My portfolio', url: 'https://example.com/portfolio', weight: 5 },
  { code: 'resume', title: 'Resume (PDF)', url: 'https://example.com/resume.pdf', weight: 4 },
  { code: 'launch-day', title: 'Product launch post', url: 'https://example.com/blog/launch', weight: 6 },
  { code: 'github', title: 'GitHub profile', url: 'https://github.com/example', weight: 3 },
  { code: 'summer-sale', title: 'Summer sale', url: 'https://example.com/sale', weight: 2, expiresAt: new Date(Date.now() + 10 * 864e5) },
  { code: 'old-promo', title: 'Old promo (disabled)', url: 'https://example.com/promo', weight: 1, isActive: false },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/linkly');
  const existing = await User.findOne({ email: 'demo@linkly.dev' });
  if (existing) {
    const old = await Link.find({ user: existing._id }).distinct('_id');
    await Click.deleteMany({ link: { $in: old } });
    await Link.deleteMany({ user: existing._id });
    await User.deleteOne({ _id: existing._id });
  }
  await Link.deleteMany({ code: { $in: links.map((l) => l.code) } });

  const user = await User.create({ name: 'Demo User', email: 'demo@linkly.dev', password: 'demo1234' });
  const clicks = [];

  for (const def of links) {
    const link = await Link.create({
      user: user._id,
      code: def.code,
      title: def.title,
      originalUrl: def.url,
      expiresAt: def.expiresAt || null,
      isActive: def.isActive !== false,
    });
    const n = def.weight * 35 + Math.floor(Math.random() * 30);
    let last = null;
    for (let i = 0; i < n; i++) {
      // bias towards recent days with a mild weekly rhythm
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.4) * 30);
      const createdAt = new Date(Date.now() - daysAgo * 864e5 - Math.floor(Math.random() * 864e5));
      if (!last || createdAt > last) last = createdAt;
      clicks.push({
        link: link._id,
        createdAt,
        device: pick(devices),
        browser: pick(browsers),
        os: pick(systems),
        country: pick(countries),
        referrer: pick(referrers),
        visitor: crypto.createHash('sha256').update(String(Math.floor(Math.random() * n * 0.7)) + def.code).digest('hex').slice(0, 24),
      });
    }
    await Link.updateOne({ _id: link._id }, { clicks: n, lastClickedAt: last });
  }
  await Click.insertMany(clicks);
  console.log(`Seeded demo user (demo@linkly.dev / demo1234), ${links.length} links, ${clicks.length} clicks`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
