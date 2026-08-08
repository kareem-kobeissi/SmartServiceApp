const express = require('express');

const {
  getCurrentUser,
  login,
  register,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  registerPushToken,
  unregisterPushToken,
} = require('../controllers/pushTokenController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);
router.put('/push-token', requireAuth, registerPushToken);
router.delete('/push-token', requireAuth, unregisterPushToken);

module.exports = router;
