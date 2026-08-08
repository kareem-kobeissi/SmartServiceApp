const express = require('express');

const { createRequestRating } = require('../controllers/ratingController');
const {
  authorizeRoles,
  requireAuth,
} = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, authorizeRoles('customer'));
router.post('/', createRequestRating);

module.exports = router;
