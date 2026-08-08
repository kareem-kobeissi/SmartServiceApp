const mongoose = require('mongoose');

const ServiceRequest = require('../models/ServiceRequest');

const CLEANUP_STATUSES = ['rejected', 'completed', 'cancelled'];

async function hideCustomerRequest(request, response) {
  const { requestId } = request.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  try {
    const serviceRequest = await ServiceRequest.findById(requestId).select(
      'customer status hiddenForCustomer',
    );

    if (!serviceRequest) {
      return response.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    if (serviceRequest.customer.toString() !== request.user.id) {
      return response.status(403).json({
        success: false,
        message: 'You cannot remove another customer’s request.',
      });
    }

    if (!CLEANUP_STATUSES.includes(serviceRequest.status)) {
      return response.status(400).json({
        success: false,
        message: 'Active requests cannot be removed from your list.',
      });
    }

    if (serviceRequest.hiddenForCustomer) {
      return response.status(400).json({
        success: false,
        message: 'This request is already removed from your list.',
      });
    }

    const updateResult = await ServiceRequest.updateOne(
      {
        _id: requestId,
        customer: request.user.id,
        status: { $in: CLEANUP_STATUSES },
        hiddenForCustomer: { $ne: true },
      },
      { $set: { hiddenForCustomer: true } },
    );

    if (updateResult.matchedCount !== 1) {
      return response.status(400).json({
        success: false,
        message: 'The request changed before it could be removed.',
      });
    }

    return response.status(200).json({
      success: true,
      message: 'Request removed from your list.',
      request: { id: requestId, hiddenForCustomer: true },
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to remove the request from your list.',
    });
  }
}

async function hideProviderRequest(request, response) {
  const { requestId } = request.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  try {
    const serviceRequest = await ServiceRequest.findById(requestId).select(
      'provider status hiddenForProvider',
    );

    if (!serviceRequest) {
      return response.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    if (!serviceRequest.provider || serviceRequest.provider.toString() !== request.user.id) {
      return response.status(403).json({
        success: false,
        message: 'You cannot remove a request assigned to another provider.',
      });
    }

    if (!CLEANUP_STATUSES.includes(serviceRequest.status)) {
      return response.status(400).json({
        success: false,
        message: 'Active requests cannot be removed from your list.',
      });
    }

    if (serviceRequest.hiddenForProvider) {
      return response.status(400).json({
        success: false,
        message: 'This request is already removed from your list.',
      });
    }

    const updateResult = await ServiceRequest.updateOne(
      {
        _id: requestId,
        provider: request.user.id,
        status: { $in: CLEANUP_STATUSES },
        hiddenForProvider: { $ne: true },
      },
      { $set: { hiddenForProvider: true } },
    );

    if (updateResult.matchedCount !== 1) {
      return response.status(400).json({
        success: false,
        message: 'The request changed before it could be removed.',
      });
    }

    return response.status(200).json({
      success: true,
      message: 'Request removed from your list.',
      request: { id: requestId, hiddenForProvider: true },
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to remove the request from your list.',
    });
  }
}

module.exports = {
  CLEANUP_STATUSES,
  hideCustomerRequest,
  hideProviderRequest,
};
