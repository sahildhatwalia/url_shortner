const router = require('express').Router();
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const authLimiter = rateLimit({
  keyPrefix: 'auth',
  windowSec: 15 * 60,
  max: 20,
  message: 'Too many sign-in attempts. Try again in a few minutes',
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, me);

module.exports = router;
