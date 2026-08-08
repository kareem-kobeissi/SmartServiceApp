const {
  ALLOWED_AVAILABILITY_STATUSES,
  ALLOWED_SERVICE_TYPES,
} = require('../constants/providerOptions');
const User = require('../models/User');
const { hasActiveProviderRequest } = require('../services/providerAvailabilityService');

function formatProvider(provider) {
  const coordinates = provider.providerLocation?.coordinates;
  const hasLocation =
    Array.isArray(coordinates) && coordinates.length === 2;

  return {
    id: provider.id,
    fullName: provider.fullName,
    email: provider.email,
    serviceTypes: provider.serviceTypes,
    availabilityStatus: provider.availabilityStatus,
    averageRating: provider.averageRating,
    ratingCount: provider.ratingCount,
    locationAvailable: hasLocation,
    latitude: hasLocation ? coordinates[1] : null,
    longitude: hasLocation ? coordinates[0] : null,
    locationUpdatedAt: provider.locationUpdatedAt,
  };
}

async function getMyProviderProfile(request, response) {
  try {
    const provider = await User.findById(request.user.id);

    if (!provider) {
      return response.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    return response.status(200).json({
      success: true,
      provider: formatProvider(provider),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve the provider profile.',
    });
  }
}

async function updateMyProviderProfile(request, response) {
  const hasServiceTypes = Object.prototype.hasOwnProperty.call(
    request.body,
    'serviceTypes',
  );
  const hasAvailabilityStatus = Object.prototype.hasOwnProperty.call(
    request.body,
    'availabilityStatus',
  );

  if (!hasServiceTypes && !hasAvailabilityStatus) {
    return response.status(400).json({
      success: false,
      message: 'Provide service types or an availability status to update.',
    });
  }

  let selectedServiceTypes;

  if (hasServiceTypes) {
    if (
      !Array.isArray(request.body.serviceTypes) ||
      request.body.serviceTypes.some(
        (serviceType) =>
          typeof serviceType !== 'string' ||
          !ALLOWED_SERVICE_TYPES.includes(serviceType),
      )
    ) {
      return response.status(400).json({
        success: false,
        message: 'One or more selected service types are not supported.',
      });
    }

    selectedServiceTypes = [...new Set(request.body.serviceTypes)];
  }

  if (
    hasAvailabilityStatus &&
    (typeof request.body.availabilityStatus !== 'string' ||
      !ALLOWED_AVAILABILITY_STATUSES.includes(
        request.body.availabilityStatus,
      ))
  ) {
    return response.status(400).json({
      success: false,
      message: 'Availability status is not supported.',
    });
  }

  try {
    const provider = await User.findById(request.user.id);

    if (!provider) {
      return response.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const nextServiceTypes = hasServiceTypes
      ? selectedServiceTypes
      : provider.serviceTypes;
    const nextAvailabilityStatus = hasAvailabilityStatus
      ? request.body.availabilityStatus
      : provider.availabilityStatus;

    if (
      nextAvailabilityStatus === 'available' &&
      nextServiceTypes.length === 0
    ) {
      return response.status(400).json({
        success: false,
        message: 'Select at least one service before becoming available.',
      });
    }

    if (
      nextAvailabilityStatus === 'available' &&
      !provider.providerLocation
    ) {
      return response.status(400).json({
        success: false,
        message: 'Save your current location before becoming available.',
      });
    }
    if (
      nextAvailabilityStatus === 'available' &&
      await hasActiveProviderRequest(provider._id)
    ) {
      return response.status(409).json({
        success: false,
        message: 'Complete or cancel your active request before becoming available.',
      });
    }

    if (hasServiceTypes) {
      provider.serviceTypes = nextServiceTypes;
    }

    if (hasAvailabilityStatus) {
      provider.availabilityStatus = nextAvailabilityStatus;
    }

    await provider.save();

    return response.status(200).json({
      success: true,
      message: 'Provider profile updated successfully.',
      provider: formatProvider(provider),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to update the provider profile.',
    });
  }
}

async function updateMyProviderLocation(request, response) {
  const { latitude, longitude } = request.body;

  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return response.status(400).json({
      success: false,
      message: 'Latitude must be a valid number between -90 and 90.',
    });
  }

  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return response.status(400).json({
      success: false,
      message: 'Longitude must be a valid number between -180 and 180.',
    });
  }

  try {
    const provider = await User.findById(request.user.id);

    if (!provider) {
      return response.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    provider.providerLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    provider.locationUpdatedAt = new Date();
    await provider.save();

    return response.status(200).json({
      success: true,
      message: 'Provider location updated successfully.',
      provider: formatProvider(provider),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to update the provider location.',
    });
  }
}

module.exports = {
  getMyProviderProfile,
  updateMyProviderProfile,
  updateMyProviderLocation,
};
