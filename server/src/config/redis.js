const { createClient } = require('redis');

let client = null;

// Redis is optional: if it is missing or goes down, caching and rate limiting
// transparently fall back to in-process memory.
async function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('Redis disabled (REDIS_URL not set): using in-memory cache');
    return;
  }
  const c = createClient({
    url,
    socket: { reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 200, 1000)) },
  });
  let warned = false;
  c.on('error', (e) => {
    if (!warned) {
      console.warn('Redis error:', e.message);
      warned = true;
    }
  });
  try {
    await c.connect();
    client = c;
    console.log('Redis connected');
  } catch (e) {
    console.warn('Redis unavailable, falling back to in-memory cache');
  }
}

function getRedis() {
  return client && client.isReady ? client : null;
}

module.exports = { initRedis, getRedis };
