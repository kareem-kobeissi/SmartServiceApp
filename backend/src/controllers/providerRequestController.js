const mongoose = require('mongoose');

const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { hasActiveProviderRequest } = require('../services/providerAvailabilityService');

const PROVIDER_VISIBLE_STATUSES = [
  'offered',
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
  'cancelled',
  'completed',
];

const STATUS_TRANSITIONS = {
  accepted: 'on_the_way',
  on_the_way: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
};

const STATUS_TIMESTAMP_FIELDS = {
  on_the_way: 'onTheWayAt',
  arrived: 'arrivedAt',
  in_progress: 'startedAt',
  completed: 'completedAt',
};

function buildLifecycleStatusSet(status, timestamp = new Date()) {
  return {
    status,
    [STATUS_TIMESTAMP_FIELDS[status]]: timestamp,
    ...(status === 'completed'
      ? {
          locationSharingActive: false,
          locationSharingStoppedAt: timestamp,
          lastProviderLocation: null,
          lastProviderLocationUpdatedAt: null,
        }
      : {}),
  };
}
function logLifecycleUpdate({ requestId, previousStatus, newStatus, matched }) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log('Service request lifecycle update', {
    requestId: String(requestId),
    previousStatus,
    newStatus,
    matched,
  });
}

function formatProviderRequest(serviceRequest) {
  return {
    id: serviceRequest._id,
    customerName: serviceRequest.customerName,
    serviceType: serviceRequest.serviceType,
    description: serviceRequest.description,
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
    status: serviceRequest.status,
    distanceKm: Number((serviceRequest.distanceMeters / 1000).toFixed(2)),
    createdAt: serviceRequest.createdAt,
    acceptedAt: serviceRequest.acceptedAt,
    onTheWayAt: serviceRequest.onTheWayAt,
    arrivedAt: serviceRequest.arrivedAt,
    startedAt: serviceRequest.startedAt,
    completedAt: serviceRequest.completedAt,
  };
}

async function getProviderRequests(request, response) {
  try {
    const provider = await User.findById(request.user.id);

    if (!provider) {
      return response.status(404).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    if (!provider.providerLocation) {
      return response.status(400).json({
        success: false,
        message: 'Save your provider location before viewing requests.',
      });
    }

    const serviceRequests = await ServiceRequest.aggregate([
      {
        $geoNear: {
          near: provider.providerLocation,
          key: 'customerLocation',
          distanceField: 'distanceMeters',
          spherical: true,
          query: {
            provider: provider._id,
            status: { $in: PROVIDER_VISIBLE_STATUSES },
            hiddenForProvider: { $ne: true },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerProfile',
        },
      },
      { $unwind: '$customerProfile' },
      {
        $project: {
          customerName: '$customerProfile.fullName',
          serviceType: 1,
          description: 1,
          status: 1,
          priorityLevel: 1,
          priorityScore: 1,
          priorityReason: 1,
          analyzedAt: 1,
          estimatedMinPrice: 1,
          estimatedMaxPrice: 1,
          estimatedDurationMinutes: 1,
          estimationReason: 1,
          estimationCurrency: 1,
          estimatedAt: 1,
          distanceMeters: 1,
          createdAt: 1,
          acceptedAt: 1,
          onTheWayAt: 1,
          arrivedAt: 1,
          startedAt: 1,
          completedAt: 1,
        },
      },
      { $sort: { priorityScore: -1, createdAt: 1 } },
    ]);

    return response.status(200).json({
      success: true,
      requests: serviceRequests.map(formatProviderRequest),
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve provider requests.',
    });
  }
}

async function respondToProviderRequest(request, response) {
  const { action } = request.body;

  if (!['accept', 'reject'].includes(action)) {
    return response.status(400).json({
      success: false,
      message: 'Action must be accept or reject.',
    });
  }

  if (!mongoose.isValidObjectId(request.params.requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Offered request not found.',
    });
  }

  const session = await mongoose.startSession();
  let updatedRequest;

  try {
    await session.withTransaction(async () => {
      const respondedAt = new Date();
      const update =
        action === 'accept'
          ? {
              $set: {
                status: 'accepted',
                providerRespondedAt: respondedAt,
                acceptedAt: respondedAt,
              },
            }
          : {
              $set: {
                provider: null,
                status: 'rejected',
                providerRespondedAt: respondedAt,
                lastRejectedProvider: request.user.id,
                lastRejectedAt: respondedAt,
                locationSharingActive: false,
                locationSharingStoppedAt: respondedAt,
                lastProviderLocation: null,
                lastProviderLocationUpdatedAt: null,
              },
              $addToSet: {
                rejectedProviders: request.user.id,
              },
            };

      updatedRequest = await ServiceRequest.findOneAndUpdate(
        {
          _id: request.params.requestId,
          provider: request.user.id,
          status: 'offered',
        },
        update,
        { new: true, session },
      );

      if (!updatedRequest) {
        const error = new Error(
          'This offer is no longer available for a response.',
        );
        error.status = 409;
        throw error;
      }

      if (action === 'accept') {
        await User.updateOne(
          { _id: request.user.id, role: 'provider' },
          { $set: { availabilityStatus: 'busy' } },
          { session },
        );
      }
    });

    return response.status(200).json({
      success: true,
      message:
        action === 'accept'
          ? 'Service request accepted successfully.'
          : 'Service request rejected successfully.',
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        providerRespondedAt: updatedRequest.providerRespondedAt,
        acceptedAt: updatedRequest.acceptedAt,
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
      message: 'Unable to respond to the service request.',
    });
  } finally {
    await session.endSession();
  }
}

async function updateProviderRequestStatus(request, response) {
  const { status } = request.body;
  const { requestId } = request.params;

  if (!Object.values(STATUS_TRANSITIONS).includes(status)) {
    return response.status(400).json({
      success: false,
      message: 'Status is not a supported lifecycle transition.',
    });
  }

  if (!mongoose.isValidObjectId(requestId)) {
    return response.status(404).json({
      success: false,
      message: 'Service request not found.',
    });
  }

  const session = await mongoose.startSession();
  let updatedRequest;

  try {
    await session.withTransaction(async () => {
      const serviceRequest = await ServiceRequest.findOne({
        _id: requestId,
        provider: request.user.id,
      }).session(session);

      if (!serviceRequest) {
        logLifecycleUpdate({
          requestId,
          previousStatus: null,
          newStatus: status,
          matched: false,
        });
        const error = new Error('Service request not found.');
        error.status = 404;
        throw error;
      }

      const expectedStatus = STATUS_TRANSITIONS[serviceRequest.status];

      if (expectedStatus !== status) {
        logLifecycleUpdate({
          requestId,
          previousStatus: serviceRequest.status,
          newStatus: status,
          matched: false,
        });
        const error = new Error(
          'Request statuses must follow the required lifecycle order.',
        );
        error.status = 409;
        throw error;
      }

      const timestampField = STATUS_TIMESTAMP_FIELDS[status];
      const updateResult = await ServiceRequest.updateOne(
        {
          _id: serviceRequest._id,
          provider: request.user.id,
          status: serviceRequest.status,
        },
        {
          $set: buildLifecycleStatusSet(status),
        },
        { session },
      );

      const matched = updateResult.matchedCount === 1;
      logLifecycleUpdate({
        requestId,
        previousStatus: serviceRequest.status,
        newStatus: status,
        matched,
      });

      if (!matched) {
        const error = new Error(
          'The request status changed before this update was completed.',
        );
        error.status = 409;
        throw error;
      }

      updatedRequest = await ServiceRequest.findById(serviceRequest._id)
        .session(session);

      if (!updatedRequest) {
        const error = new Error('The updated service request could not be read.');
        error.status = 500;
        throw error;
      }

      if (status === 'completed') {
        const hasOtherActiveRequest = await hasActiveProviderRequest(
          request.user.id,
          { excludeRequestId: serviceRequest._id, session },
        );
        await User.updateOne(
          {
            _id: request.user.id,
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

    return response.status(200).json({
      success: true,
      message: 'Request status updated successfully.',
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        acceptedAt: updatedRequest.acceptedAt,
        onTheWayAt: updatedRequest.onTheWayAt,
        arrivedAt: updatedRequest.arrivedAt,
        startedAt: updatedRequest.startedAt,
        completedAt: updatedRequest.completedAt,
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
      message: 'Unable to update the request status.',
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  buildLifecycleStatusSet,
  getProviderRequests,
  respondToProviderRequest,
  updateProviderRequestStatus,
};
