const { getRedis } = require('../config/redis');

// Fixed-window rate limiter. Uses Redis INCR/EXPIRE (shared across server instances)
// and falls back to an in-memory map when Redis is unavailable.
const store = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, e] of store) if (e.reset <= now) store.delete(key);
}, 60 * 1000).unref();

function memHit(key, windowSec) {
  const now = Date.now();
  let e = store.get(key);
  if (!e || e.reset <= now) {
    e = { count: 0, reset: now + windowSec * 1000 };
    store.set(key, e);
  }
  e.count += 1;
  return { count: e.count, ttl: Math.max(1, Math.ceil((e.reset - now) / 1000)) };
}

async function hit(key, windowSec) {
  const r = getRedis();
  if (r) {
    try {
      const count = await r.incr(key);
      if (count === 1) await r.expire(key, windowSec);
      let ttl = await r.ttl(key);
      if (ttl < 0) {
        await r.expire(key, windowSec);
        ttl = windowSec;
      }
      return { count, ttl };
    } catch {
      /* fall back to memory */
    }
  }
  return memHit(key, windowSec);
}

function rateLimit({ keyPrefix, windowSec = 60, max = 100, keyFn = (req) => req.ip, message }) {
  return async (req, res, next) => {
    try {
      const id = keyFn(req);
      const { count, ttl } = await hit(`rl:${keyPrefix}:${id}`, windowSec);
      res.set({
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': String(Math.max(0, max - count)),
        'X-RateLimit-Reset': String(ttl),
      });
      if (count > max) {
        res.set('Retry-After', String(ttl));
        return res.status(429).json({ message: message || `Too many requests. Try again in ${ttl} seconds` });
      }
      next();
    } catch (e) {
      next(); // never block traffic because the limiter itself failed
    }
  };
}

module.exports = { rateLimit };
