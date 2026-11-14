const { getRedis } = require('../config/redis');

// Cache-aside store for hot redirect lookups: Redis when available, Map otherwise.
const mem = new Map();
const k = (code) => `link:${code}`;

async function get(code) {
  const r = getRedis();
  if (r) {
    try {
      const v = await r.get(k(code));
      return v ? JSON.parse(v) : null;
    } catch {
      /* fall through to memory */
    }
  }
  const e = mem.get(code);
  if (!e) return null;
  if (e.exp <= Date.now()) {
    mem.delete(code);
    return null;
  }
  return e.val;
}

async function set(code, val, ttlSec) {
  const r = getRedis();
  if (r) {
    try {
      await r.set(k(code), JSON.stringify(val), { EX: ttlSec });
      return;
    } catch {
      /* fall through */
    }
  }
  mem.set(code, { val, exp: Date.now() + ttlSec * 1000 });
}

async function del(code) {
  mem.delete(code);
  const r = getRedis();
  if (r) {
    try {
      await r.del(k(code));
    } catch {
      /* ignore */
    }
  }
}

module.exports = { get, set, del };
