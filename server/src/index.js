require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { initRedis, getRedis } = require('./config/redis');
const { rateLimit } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');
const { redirect } = require('./controllers/redirectController');

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET is required in production');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-only-secret';
  console.warn('JWT_SECRET not set: using an insecure development secret');
}

const app = express();
app.set('trust proxy', 1); // correct client IPs behind a proxy / load balancer
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', exposedHeaders: ['X-RateLimit-Remaining', 'Retry-After'] }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', redis: !!getRedis(), uptime: process.uptime() }));

app.use('/api', rateLimit({ keyPrefix: 'api', windowSec: 60, max: 120 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/links', require('./routes/links'));

// Public short-link redirect, with its own (more generous) limit per IP.
app.get('/:code', rateLimit({ keyPrefix: 'redirect', windowSec: 60, max: 300 }), redirect);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await initRedis();
    app.listen(PORT, () => console.log(`Linkly API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
