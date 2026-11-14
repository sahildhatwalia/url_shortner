const Click = require('../models/Click');

const DAY = 24 * 60 * 60 * 1000;

const topBy = (field, limit = 8) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: limit },
];

const toList = (rows) => rows.map((r) => ({ label: r._id || 'Unknown', count: r.count }));

function startOfWindow(days) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return new Date(today.getTime() - (days - 1) * DAY);
}

function fillDays(rows, days) {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const start = startOfWindow(days);
  const out = [];
  for (let i = 0; i < days; i++) {
    const key = new Date(start.getTime() + i * DAY).toISOString().slice(0, 10);
    out.push({ date: key, clicks: map.get(key) || 0 });
  }
  return out;
}

// One round trip to MongoDB: $facet runs every breakdown over the same filtered click set.
async function buildAnalytics(linkMatch, days) {
  const since = startOfWindow(days);
  const [res] = await Click.aggregate([
    { $match: { ...linkMatch, createdAt: { $gte: since } } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        unique: [{ $group: { _id: '$visitor' } }, { $count: 'n' }],
        byDay: [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        ],
        devices: topBy('device', 5),
        browsers: topBy('browser', 6),
        os: topBy('os', 6),
        countries: topBy('country', 8),
        referrers: topBy('referrer', 8),
      },
    },
  ]);
  return {
    days,
    total: res.total[0]?.n || 0,
    unique: res.unique[0]?.n || 0,
    byDay: fillDays(res.byDay, days),
    devices: toList(res.devices),
    browsers: toList(res.browsers),
    os: toList(res.os),
    countries: toList(res.countries),
    referrers: toList(res.referrers),
  };
}

module.exports = { buildAnalytics };
