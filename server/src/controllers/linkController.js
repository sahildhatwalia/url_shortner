const QRCode = require('qrcode');
const mongoose = require('mongoose');
const Link = require('../models/Link');
const Click = require('../models/Click');
const cache = require('../utils/cache');
const { buildAnalytics } = require('./analytics');
const { HttpError, asyncHandler } = require('../utils/http');
const { generateCode, validateAlias, parseDestination } = require('../utils/code');

const baseUrl = () => (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

function serialize(link) {
  const l = link.toObject ? link.toObject() : link;
  const expired = l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now();
  return {
    id: l._id,
    code: l.code,
    shortUrl: `${baseUrl()}/${l.code}`,
    originalUrl: l.originalUrl,
    title: l.title || '',
    clicks: l.clicks,
    isActive: l.isActive,
    expiresAt: l.expiresAt,
    lastClickedAt: l.lastClickedAt,
    createdAt: l.createdAt,
    status: !l.isActive ? 'disabled' : expired ? 'expired' : 'active',
  };
}

function parseExpiry(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Expiry date is not valid');
  if (d.getTime() <= Date.now()) throw new HttpError(400, 'Expiry date must be in the future');
  return d;
}

async function findOwned(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Link not found');
  const link = await Link.findOne({ _id: id, user: req.user._id });
  if (!link) throw new HttpError(404, 'Link not found');
  return link;
}

exports.create = asyncHandler(async (req, res) => {
  const { url, alias, title, expiresAt } = req.body || {};
  const originalUrl = parseDestination(url);
  const expiry = parseExpiry(expiresAt);

  let code = typeof alias === 'string' ? alias.trim() : '';
  if (code) {
    validateAlias(code);
    if (await Link.exists({ code })) throw new HttpError(409, 'That alias is already taken');
  }

  let link;
  for (let attempt = 0; attempt < 5 && !link; attempt++) {
    const candidate = code || generateCode(7);
    try {
      link = await Link.create({
        user: req.user._id,
        code: candidate,
        originalUrl,
        title: title || '',
        expiresAt: expiry || null,
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
      if (code) throw new HttpError(409, 'That alias is already taken');
    }
  }
  if (!link) throw new HttpError(500, 'Could not generate a unique code');
  res.status(201).json(serialize(link));
});

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const filter = { user: req.user._id };
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rx }, { originalUrl: rx }, { title: rx }];
  }
  const [links, total] = await Promise.all([
    Link.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Link.countDocuments(filter),
  ]);
  res.json({ links: links.map(serialize), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.get = asyncHandler(async (req, res) => {
  res.json(serialize(await findOwned(req)));
});

exports.update = asyncHandler(async (req, res) => {
  const link = await findOwned(req);
  const { url, title, isActive, expiresAt } = req.body || {};
  if (url !== undefined) link.originalUrl = parseDestination(url);
  if (title !== undefined) link.title = title;
  if (typeof isActive === 'boolean') link.isActive = isActive;
  const expiry = parseExpiry(expiresAt);
  if (expiry !== undefined) link.expiresAt = expiry;
  await link.save();
  await cache.del(link.code); // invalidate so the next redirect sees the change
  res.json(serialize(link));
});

exports.remove = asyncHandler(async (req, res) => {
  const link = await findOwned(req);
  await Promise.all([Click.deleteMany({ link: link._id }), link.deleteOne(), cache.del(link.code)]);
  res.json({ message: 'Link deleted' });
});

exports.qr = asyncHandler(async (req, res) => {
  const link = await findOwned(req);
  const dataUrl = await QRCode.toDataURL(`${baseUrl()}/${link.code}`, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0E1B2E', light: '#FFFFFF' },
  });
  res.json({ dataUrl });
});

exports.analytics = asyncHandler(async (req, res) => {
  const link = await findOwned(req);
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  res.json(await buildAnalytics({ link: link._id }, days));
});

exports.overview = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const ids = await Link.find({ user: req.user._id }).distinct('_id');
  const [analytics, totals, top] = await Promise.all([
    buildAnalytics({ link: { $in: ids } }, days),
    Link.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          links: { $sum: 1 },
          clicks: { $sum: '$clicks' },
          active: {
            $sum: {
              $cond: [
                { $and: ['$isActive', { $or: [{ $eq: ['$expiresAt', null] }, { $gt: ['$expiresAt', new Date()] }] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Link.find({ user: req.user._id }).sort({ clicks: -1 }).limit(5),
  ]);
  const t = totals[0] || { links: 0, clicks: 0, active: 0 };
  res.json({
    totals: { links: t.links, activeLinks: t.active, allTimeClicks: t.clicks },
    analytics,
    topLinks: top.map(serialize),
  });
});
