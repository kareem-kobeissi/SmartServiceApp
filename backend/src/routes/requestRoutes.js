const express = require('express');

const {
  cancelServiceRequest,
  createServiceRequest,
  getAvailableProviders,
  getMyServiceRequests,
  selectProvider,
} = require('../controllers/requestController');
const {
  hideCustomerRequest,
} = require('../controllers/requestCleanupController');
const {
  authorizeRoles,
  requireAuth,
} = require('../middleware/authMiddleware');
const {
  handleServiceRequestImageUpload,
} = require('../middleware/uploadMiddleware');

const router = express.Router();
const ratingRoutes = require('./ratingRoutes');

router.use(requireAuth, authorizeRoles('customer'));
router.use('/:requestId/rating', ratingRoutes);
router.post('/', handleServiceRequestImageUpload, createServiceRequest);
router.get('/my', getMyServiceRequests);
router.get('/:requestId/available-providers', getAvailableProviders);
router.patch('/:requestId/select-provider', selectProvider);
router.patch('/:requestId/cancel', cancelServiceRequest);
router.patch('/:requestId/hide', hideCustomerRequest);

module.exports = router;
