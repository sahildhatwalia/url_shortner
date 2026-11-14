const router = require('express').Router();
const c = require('../controllers/linkController');
const { protect } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

router.use(protect);

const createLimiter = rateLimit({
  keyPrefix: 'create',
  windowSec: 60,
  max: 20,
  keyFn: (req) => String(req.user._id),
  message: 'You are creating links too quickly. Wait a moment and try again',
});

router.get('/overview', c.overview); // must come before /:id
router.route('/').get(c.list).post(createLimiter, c.create);
router.route('/:id').get(c.get).patch(c.update).delete(c.remove);
router.get('/:id/qr', c.qr);
router.get('/:id/analytics', c.analytics);

module.exports = router;
