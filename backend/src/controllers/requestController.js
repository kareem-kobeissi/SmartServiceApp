const {
  ALLOWED_SERVICE_TYPES,
} = require('../constants/providerOptions');
const mongoose = require('mongoose');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const {
  removeServiceRequestImage,
  saveServiceRequestImage,
} = require('../middleware/uploadMiddleware');
const {
  analyzeRequestPriority,
} = require('../services/priorityAnalysisService');
const {
  estimateServiceRequest,
} = require('../services/serviceEstimationService');
const {
  hasActiveProviderRequest,
} = require('../services/providerAvailabilityService');

const DEFAULT_PROVIDER_SEARCH_RADIUS_KM = 50;
const AVERAGE_TRAVEL_SPEED_KM_PER_HOUR = 30;
const CUSTOMER_CANCELLABLE_STATUSES = [
  'pending',
  'offered',
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
];
const CANCELLATION_FEE_USD = 10;

function isCustomerCancellationAllowed(status) {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

function compareAvailableProviders(firstProvider, secondProvider) {
  const distanceDifference =
    firstProvider.distanceMeters - secondProvider.distanceMeters;

  if (distanceDifference !== 0) {
    return distanceDifference;
  }

  return (
    (secondProvider.averageRating || 0) -
    (firstProvider.averageRating || 0)
  );
}

function formatServiceRequest(serviceRequest) {
  const selectedProvider = serviceRequest.provider?.fullName
    ? {
        id: serviceRequest.provider.id,
        fullName: serviceRequest.provider.fullName,
      }
    : serviceRequest.provider;
  const lastRejectedProvider = serviceRequest.lastRejectedProvider?.fullName
    ? {
        id: serviceRequest.lastRejectedProvider.id,
        fullName: serviceRequest.lastRejectedProvider.fullName,
      }
    : serviceRequest.lastRejectedProvider;

  return {
    id: serviceRequest.id,
    customer: serviceRequest.customer,
    provider: selectedProvider,
    serviceType: serviceRequest.serviceType,
    description: serviceRequest.description,
    imageUrl: serviceRequest.imageUrl,
    priorityLevel: serviceRequest.priorityLevel,
    priorityScore: serviceRequest.priorityScore,
    priorityReason: serviceRequest.priorityReason,
    analyzedAt: serviceRequest.analyzedAt,
    estimatedMinPrice: serviceRequest.estimatedMinPrice,
    estimatedMaxPrice: serviceRequest.estimatedMaxPrice,
    estimatedDurationMinutes: serviceRequest.estimatedDurationMinutes,
    estimationReason: serviceRequest.estimationReason,
    estimationCurrency: serviceRequest.estimationCurrency,
    estimatedAt: serviceRequest.estimatedAt,
    customerLocation: serviceRequest.customerLocation,
    status: serviceRequest.status,
    isRated: serviceRequest.isRated,
    rating: serviceRequest.rating?.score
      ? {
          id: serviceRequest.rating.id,
          score: serviceRequest.rating.score,
        }
      : serviceRequest.rating,
    offeredAt: serviceRequest.offeredAt,
    providerRespondedAt: serviceRequest.providerRespondedAt,
    acceptedAt: serviceRequest.acceptedAt,
    onTheWayAt: serviceRequest.onTheWayAt,
    arrivedAt: serviceRequest.arrivedAt,
    startedAt: serviceRequest.startedAt,
    completedAt: serviceRequest.completedAt,
    lastRejectedProvider,
    lastRejectedAt: serviceRequest.lastRejectedAt,
    createdAt: serviceRequest.createdAt,
    updatedAt: serviceRequest.updatedAt,
  };
}

async function createServiceRequest(request, response) {
  const {
    serviceType,
    description,
    latitude,
    longitude,
  } = request.body;

  if (
    typeof serviceType !== 'string' ||
    !ALLOWED_SERVICE_TYPES.includes(serviceType)
  ) {
    return response.status(400).json({
      success: false,
      message: 'Select a supported service type.',
    });
  }

  if (
    typeof description !== 'string' ||
    description.trim().length < 10
  ) {
    return response.status(400).json({
      success: false,
      message: 'Description must contain at least 10 characters.',
    });
  }

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

  let imageUrl = null;

  try {
    imageUrl = await saveServiceRequestImage(request.file);
    const priorityAnalysis = analyzeRequestPriority(serviceType, description);
    const analyzedAt = new Date();
    const serviceEstimate = estimateServiceRequest({
      serviceType,
      description,
      priorityLevel: priorityAnalysis.priorityLevel,
    });
    const estimatedAt = new Date();
    const serviceRequest = await ServiceRequest.create({
      customer: request.user.id,
      serviceType,
      description: description.trim(),
      imageUrl,
      ...priorityAnalysis,
      analyzedAt,
      ...serviceEstimate,
      estimatedAt,
      customerLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    });

    return response.status(201).json({
      success: true,
      message: 'Service request created successfully.',
      request: formatServiceRequest(serviceRequest),
    });
  } catch {
    await removeServiceRequestImage(imageUrl);
    return response.status(500).json({
      success: false,
      message: 'Unable to create the service request.',
    });
  }
}

async function getMyServiceRequests(request, response) {
  try {
    const serviceRequests = await ServiceRequest.find({
      customer: request.user.id,
      hiddenForCustomer: { $ne: true },
    })
      .populate('provider', 'fullName')
      .populate('lastRejectedProvider', 'fullName')
      .populate('rating', 'score')
      .sort({ createdAt: -1 });

    return response.status(200).json({
      success: true,
      requests: serviceRequests.map(formatServiceRequest),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve service requests.',
    });
  }
}

function getProviderSearchRadiusKm() {
  const configuredRadius = Number(process.env.PROVIDER_SEARCH_RADIUS_KM);

  return Number.isFinite(configuredRadius) && configuredRadius > 0
    ? configuredRadius
    : DEFAULT_PROVIDER_SEARCH_RADIUS_KM;
}

async function getAvailableProviders(request, response) {
  if (!mongoose.isValidObjectId(request.params.requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  try {
    const serviceRequest = await ServiceRequest.findOne({
      _id: request.params.requestId,
      customer: request.user.id,
    });

    if (!serviceRequest) {
      return response.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    const coordinates = serviceRequest.customerLocation?.coordinates;

    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !coordinates.every(Number.isFinite)
    ) {
      return response.status(400).json({
        success: false,
        message: 'This request does not have a valid customer location.',
      });
    }

    if (!['pending', 'rejected'].includes(serviceRequest.status)) {
      return response.status(400).json({
        success: false,
        message:
          'Providers can only be found for pending or rejected requests.',
      });
    }

    if (serviceRequest.provider) {
      return response.status(400).json({
        success: false,
        message: 'This request already has a provider.',
      });
    }

    const searchRadiusKm = getProviderSearchRadiusKm();
    const providers = await User.aggregate([
      {
        $geoNear: {
          near: serviceRequest.customerLocation,
          key: 'providerLocation',
          distanceField: 'distanceMeters',
          maxDistance: searchRadiusKm * 1000,
          spherical: true,
          query: {
            role: 'provider',
            availabilityStatus: 'available',
            serviceTypes: serviceRequest.serviceType,
            providerLocation: { $ne: null },
            _id: { $nin: serviceRequest.rejectedProviders },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          serviceTypes: 1,
          averageRating: 1,
          distanceMeters: 1,
        },
      },
    ]);
    providers.sort(compareAvailableProviders);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Provider discovery', {
        requestId: String(serviceRequest._id),
        serviceType: serviceRequest.serviceType,
        searchRadiusKm,
        returnedCount: providers.length,
      });
    }
    return response.status(200).json({
      success: true,
      searchRadiusKm,
      etaNotice:
        'Arrival times are approximate estimates based on 30 km/h, not Google Maps routes or traffic.',
      providers: providers.map((provider) => {
        const distanceKm = provider.distanceMeters / 1000;

        return {
          id: provider._id,
          fullName: provider.fullName,
          serviceTypes: provider.serviceTypes,
          averageRating: provider.averageRating,
          distanceKm: Number(distanceKm.toFixed(2)),
          approximateArrivalMinutes: Math.max(
            5,
            Math.ceil(
              (distanceKm / AVERAGE_TRAVEL_SPEED_KM_PER_HOUR) * 60,
            ),
          ),
        };
      }),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to find available providers.',
    });
  }
}

async function cancelServiceRequest(request, response) {
  if (!mongoose.isValidObjectId(request.params.requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  const session = await mongoose.startSession();
  let cancelledRequest;

  try {
    await session.withTransaction(async () => {
      const serviceRequest = await ServiceRequest.findOne({
        _id: request.params.requestId,
        customer: request.user.id,
      }).session(session);

      if (!serviceRequest) {
        const error = new Error('Service request not found.');
        error.status = 404;
        throw error;
      }

      if (!isCustomerCancellationAllowed(serviceRequest.status)) {
        const error = new Error(
          'Only a non-terminal service request can be cancelled.',
        );
        error.status = 409;
        throw error;
      }

      const cancelledAt = new Date();
      cancelledRequest = await ServiceRequest.findOneAndUpdate(
        {
          _id: serviceRequest._id,
          customer: request.user.id,
          status: serviceRequest.status,
        },
        {
          $set: {
            status: 'cancelled',
            locationSharingActive: false,
            locationSharingStoppedAt: cancelledAt,
            lastProviderLocation: null,
            lastProviderLocationUpdatedAt: null,
          },
        },
        { new: true, session },
      );

      if (!cancelledRequest) {
        const error = new Error(
          'The request changed before cancellation was completed.',
        );
        error.status = 409;
        throw error;
      }

      if (
        serviceRequest.provider &&
        ['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(
          serviceRequest.status,
        )
      ) {
        const hasOtherActiveRequest = await hasActiveProviderRequest(
          serviceRequest.provider,
          { excludeRequestId: serviceRequest._id, session },
        );

        await User.updateOne(
          {
            _id: serviceRequest.provider,
            role: 'provider',
            'serviceTypes.0': { $exists: true },
            providerLocation: { $ne: null },
          },
          {
            $set: {
              availabilityStatus: hasOtherActiveRequest ? 'busy' : 'available',
            },
          },
          { session },
        );
      }
    });

    await cancelledRequest.populate('provider', 'fullName');

    return response.status(200).json({
      success: true,
      message: 'Service request cancelled successfully.',
      cancellationFee: CANCELLATION_FEE_USD,
      request: formatServiceRequest(cancelledRequest),
    });
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return response.status(500).json({
      success: false,
      message: 'Unable to cancel the service request.',
    });
  } finally {
    await session.endSession();
  }
}

async function selectProvider(request, response) {
  const { providerId } = request.body;

  if (
    typeof providerId !== 'string' ||
    !mongoose.isValidObjectId(providerId)
  ) {
    return response.status(400).json({
      success: false,
      message: 'Select a valid provider.',
    });
  }

  if (!mongoose.isValidObjectId(request.params.requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  const session = await mongoose.startSession();
  let selectedRequest;
  let selectedProvider;

  try {
    await session.withTransaction(async () => {
      const serviceRequest = await ServiceRequest.findOne({
        _id: request.params.requestId,
        customer: request.user.id,
      }).session(session);

      if (!serviceRequest) {
        const error = new Error('Service request not found.');
        error.status = 404;
        throw error;
      }

      if (
        !['pending', 'rejected'].includes(serviceRequest.status) ||
        serviceRequest.provider
      ) {
        const error = new Error(
          'This request is no longer available for provider selection.',
        );
        error.status = 409;
        throw error;
      }

      if (
        serviceRequest.rejectedProviders.some(
          (rejectedProviderId) =>
            rejectedProviderId.toString() === providerId,
        )
      ) {
        const error = new Error(
          'This provider is no longer available for this request.',
        );
        error.status = 409;
        throw error;
      }

      selectedProvider = await User.findOne({
        _id: providerId,
        role: 'provider',
        availabilityStatus: 'available',
        serviceTypes: serviceRequest.serviceType,
        providerLocation: { $ne: null },
      }).session(session);

      if (!selectedProvider) {
        const error = new Error(
          'The selected provider is no longer available.',
        );
        error.status = 409;
        throw error;
      }

      selectedRequest = await ServiceRequest.findOneAndUpdate(
        {
          _id: serviceRequest._id,
          customer: request.user.id,
          status: { $in: ['pending', 'rejected'] },
          provider: null,
          rejectedProviders: { $ne: selectedProvider._id },
        },
        {
          $set: {
            provider: selectedProvider._id,
            status: 'offered',
            offeredAt: new Date(),
            providerRespondedAt: null,
          },
        },
        { new: true, session },
      );

      if (!selectedRequest) {
        const error = new Error(
          'This request is no longer available for provider selection.',
        );
        error.status = 409;
        throw error;
      }
    });

    return response.status(200).json({
      success: true,
      message: 'Provider selected successfully.',
      request: {
        ...formatServiceRequest(selectedRequest),
        provider: {
          id: selectedProvider.id,
          fullName: selectedProvider.fullName,
        },
      },
    });
  } catch (error) {
    if (error.status) {
      return response.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    return response.status(500).json({
      success: false,
      message: 'Unable to select the provider.',
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  cancelServiceRequest,
  compareAvailableProviders,
  createServiceRequest,
  getAvailableProviders,
  getMyServiceRequests,
  isCustomerCancellationAllowed,
  selectProvider,
};
