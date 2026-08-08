const express = require('express');

const {
  getProviderRequests,
  respondToProviderRequest,
  updateProviderRequestStatus,
} = require('../controllers/providerRequestController');
const {
  hideProviderRequest,
} = require('../controllers/requestCleanupController');
const {
  authorizeRoles,
  requireAuth,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, authorizeRoles('provider'));
router.get('/', getProviderRequests);
router.patch('/:requestId/respond', respondToProviderRequest);
router.patch('/:requestId/status', updateProviderRequestStatus);
router.patch('/:requestId/hide', hideProviderRequest);

module.exports = router;
