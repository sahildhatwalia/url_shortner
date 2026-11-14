const crypto = require('crypto');
const { HttpError } = require('./http');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const RESERVED = new Set(['api', 'health', 'login', 'register', 'admin', 'dashboard', 'links', 'static', 'assets', 'favicon.ico', 'robots.txt']);
const CODE_RE = /^[A-Za-z0-9_-]{3,30}$/;

// Random base62 code using rejection sampling to avoid modulo bias.
function generateCode(length = 7) {
  let out = '';
  while (out.length < length) {
    const bytes = crypto.randomBytes(length * 2);
    for (const b of bytes) {
      if (b < 248 && out.length < length) out += ALPHABET[b % 62];
    }
  }
  return out;
}

function validateAlias(alias) {
  if (!CODE_RE.test(alias)) {
    throw new HttpError(400, 'Alias must be 3-30 characters: letters, numbers, hyphens or underscores');
  }
  if (RESERVED.has(alias.toLowerCase())) {
    throw new HttpError(400, 'That alias is reserved. Try another one');
  }
  return alias;
}

// Validates and normalises a destination URL.
function parseDestination(input) {
  if (typeof input !== 'string' || !input.trim()) throw new HttpError(400, 'Enter a URL to shorten');
  let raw = input.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  if (raw.length > 2048) throw new HttpError(400, 'URL is too long (max 2048 characters)');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'That does not look like a valid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new HttpError(400, 'Only http and https links can be shortened');
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') throw new HttpError(400, 'That does not look like a valid URL');
  try {
    const self = new URL(process.env.BASE_URL || 'http://localhost:5000');
    if (url.host === self.host) throw new HttpError(400, 'You cannot shorten a Linkly link');
  } catch (e) {
    if (e instanceof HttpError) throw e;
  }
  return url.toString();
}

module.exports = { generateCode, validateAlias, parseDestination, CODE_RE };
