const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const Link = require('../models/Link');
const Click = require('../models/Click');
const cache = require('../utils/cache');
const { CODE_RE } = require('../utils/code');
const { asyncHandler } = require('../utils/http');

let geoip = null;
try {
  geoip = require('geoip-lite');
} catch {
  /* geoip is optional: countries fall back to CDN headers or Unknown */
}

const SALT = process.env.JWT_SECRET || 'linkly';
const CACHE_TTL = 60 * 60; // seconds

function page(res, status, title, text) {
  res
    .status(status)
    .type('html')
    .send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;background:#EEF1F5;color:#0E1B2E;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="max-width:420px;padding:32px;text-align:center"><h1 style="margin:0 0 8px">${title}</h1><p style="color:#5B6B80;margin:0">${text}</p></main>`);
}

function countryOf(req) {
  const header = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-country-code'];
  if (header && /^[A-Za-z]{2}$/.test(header) && header !== 'XX') return String(header).toUpperCase();
  if (geoip && req.ip) {
    const ip = req.ip.replace(/^::ffff:/, '');
    const hit = geoip.lookup(ip);
    if (hit && hit.country) return hit.country;
  }
  return 'Unknown';
}

function referrerOf(req) {
  const ref = req.get('referer') || req.get('referrer');
  if (!ref) return 'Direct';
  try {
    return new URL(ref).hostname.replace(/^www\./, '') || 'Direct';
  } catch {
    return 'Direct';
  }
}

// Fire-and-forget: the visitor is already being redirected, so tracking never adds latency.
async function trackClick(req, linkId) {
  const ua = new UAParser(req.get('user-agent') || '').getResult();
  const type = ua.device.type;
  const device = type === 'mobile' ? 'mobile' : type === 'tablet' ? 'tablet' : 'desktop';
  const visitor = crypto
    .createHash('sha256')
    .update(`${SALT}|${req.ip}|${req.get('user-agent') || ''}`)
    .digest('hex')
    .slice(0, 24);

  await Promise.all([
    Click.create({
      link: linkId,
      device,
      browser: ua.browser.name || 'Unknown',
      os: ua.os.name || 'Unknown',
      country: countryOf(req),
      referrer: referrerOf(req),
      visitor,
    }),
    Link.updateOne({ _id: linkId }, { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }),
  ]);
}

exports.redirect = asyncHandler(async (req, res) => {
  const { code } = req.params;
  if (!CODE_RE.test(code)) return page(res, 404, 'Link not found', 'This short link does not exist.');

  // 1. cache-aside lookup
  let entry = await cache.get(code);
  const hit = !!entry;

  // 2. miss: read from MongoDB and populate the cache
  if (!entry) {
    const link = await Link.findOne({ code }).select('originalUrl expiresAt isActive');
    if (!link) return page(res, 404, 'Link not found', 'This short link does not exist.');
    entry = {
      id: link._id.toString(),
      url: link.originalUrl,
      exp: link.expiresAt ? link.expiresAt.getTime() : null,
      active: link.isActive,
    };
    const ttl = entry.exp ? Math.min(CACHE_TTL, Math.floor((entry.exp - Date.now()) / 1000)) : CACHE_TTL;
    if (ttl > 0) await cache.set(code, entry, ttl);
  }

  if (!entry.active) return page(res, 410, 'Link disabled', 'The owner has turned this link off.');
  if (entry.exp && entry.exp <= Date.now()) return page(res, 410, 'Link expired', 'This short link has expired.');

  res.set({ 'X-Cache': hit ? 'HIT' : 'MISS', 'Cache-Control': 'private, no-store' });
  res.redirect(302, entry.url);

  trackClick(req, entry.id).catch((e) => console.error('click tracking failed:', e.message));
});
