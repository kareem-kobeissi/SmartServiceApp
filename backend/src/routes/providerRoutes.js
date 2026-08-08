const express = require('express');

const {
  getMyProviderProfile,
  updateMyProviderLocation,
  updateMyProviderProfile,
} = require('../controllers/providerController');
const { getMyProviderRatings } = require('../controllers/ratingController');
const {
  authorizeRoles,
  requireAuth,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, authorizeRoles('provider'));
router.get('/me', getMyProviderProfile);
router.get('/me/ratings', getMyProviderRatings);
router.patch('/me', updateMyProviderProfile);
router.patch('/location', updateMyProviderLocation);

module.exports = router;
