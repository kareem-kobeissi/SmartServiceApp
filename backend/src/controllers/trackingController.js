const mongoose = require('mongoose');

const ServiceRequest = require('../models/ServiceRequest');
const { ACTIVE_TRACKING_STATUSES } = require('../realtime/providerLocationHandler');

function formatPoint(point) {
  if (!point?.coordinates || point.coordinates.length !== 2) return null;
  return { longitude: point.coordinates[0], latitude: point.coordinates[1] };
}

async function getRequestTracking(request, response) {
  if (!mongoose.isValidObjectId(request.params.requestId)) {
    return response.status(404).json({ success: false, message: 'Service request not found.' });
  }

  try {
    const serviceRequest = await ServiceRequest.findById(request.params.requestId)
      .select('customer provider status customerLocation lastProviderLocation lastProviderLocationUpdatedAt locationSharingActive locationSharingStartedAt locationSharingStoppedAt')
      .lean();

    if (!serviceRequest) {
      return response.status(404).json({ success: false, message: 'Service request not found.' });
    }

    const isCustomer = String(serviceRequest.customer) === String(request.user.id);
    const isProvider =
      serviceRequest.provider &&
      String(serviceRequest.provider) === String(request.user.id);

    if (!isCustomer && !isProvider) {
      return response.status(403).json({ success: false, message: 'You cannot track this request.' });
    }

    if (!ACTIVE_TRACKING_STATUSES.includes(serviceRequest.status)) {
      return response.status(400).json({ success: false, message: 'Live tracking is not active for this request.' });
    }

    return response.status(200).json({
      success: true,
      tracking: {
        requestId: String(serviceRequest._id),
        status: serviceRequest.status,
        customerLocation: formatPoint(serviceRequest.customerLocation),
        locationSharingActive: Boolean(serviceRequest.locationSharingActive),
        locationSharingStartedAt: serviceRequest.locationSharingStartedAt,
        locationSharingStoppedAt: serviceRequest.locationSharingStoppedAt,
        providerLocation: serviceRequest.locationSharingActive
          ? formatPoint(serviceRequest.lastProviderLocation)
          : null,
        providerLocationUpdatedAt: serviceRequest.locationSharingActive
          ? serviceRequest.lastProviderLocationUpdatedAt
          : null,
        serverTime: new Date(),
      },
    });
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to load tracking information.' });
  }
}

module.exports = { formatPoint, getRequestTracking };
