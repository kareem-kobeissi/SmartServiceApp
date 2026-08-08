const express = require('express');

const { getRequestTracking } = require('../controllers/trackingController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:requestId', requireAuth, getRequestTracking);

module.exports = router;
