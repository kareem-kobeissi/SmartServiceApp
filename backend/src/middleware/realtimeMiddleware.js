const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const {
  emitLocationSharingStopped,
  emitProviderAvailability,
  emitRequestEvent,
  removeUserFromRequestRoom,
} = require('../realtime/realtimeEvents');
const {
  sendRequestMutationNotification,
} = require('../services/pushNotificationService');

function requestMutationEvent(request, responseBody) {
  const method = request.method;
  const path = request.originalUrl.split('?')[0];

  if (method === 'POST' && path === '/api/requests') return 'request:created';
  if (method === 'PATCH' && path.endsWith('/select-provider')) return 'request:offered';
  if (method === 'PATCH' && path.endsWith('/respond')) {
    return request.body.action === 'accept' ? 'request:accepted' : 'request:rejected';
  }
  if (method === 'PATCH' && path.endsWith('/status')) return 'request:statusChanged';
  if (method === 'POST' && path.endsWith('/rating')) return 'request:rated';
  if (method === 'PATCH' && path.endsWith('/hide')) return 'request:hidden';

  return null;
}

async function publishSuccessfulMutation(request, responseBody) {
  const eventName = requestMutationEvent(request, responseBody);

  if (eventName) {
    const requestId = responseBody?.request?.id || request.params?.requestId;
    if (!requestId) return;

    const serviceRequest = await ServiceRequest.findById(requestId).select(
      'customer provider status hiddenForCustomer hiddenForProvider',
    );
    if (!serviceRequest) return;

    const actingProviderId =
      request.user?.role === 'provider' ? request.user.id : null;
    const providerId = serviceRequest.provider || actingProviderId;
    const extra = {};

    if (eventName === 'request:hidden') {
      extra.hiddenFor = request.user.role;
    }
    if (eventName === 'request:rated') {
      extra.isRated = true;
    }

    emitRequestEvent(eventName, {
      customerId: serviceRequest.customer,
      providerId,
      requestId: serviceRequest._id,
      status: serviceRequest.status,
      extra,
    });

    try {
      await sendRequestMutationNotification(eventName, serviceRequest);
    } catch {
      // Push delivery failure must never roll back a successful request update.
    }

    if (eventName === 'request:rejected' && actingProviderId) {
      removeUserFromRequestRoom(actingProviderId, serviceRequest._id);
    }
    if (
      eventName === 'request:rejected' ||
      (eventName === 'request:statusChanged' &&
        ['completed', 'cancelled'].includes(serviceRequest.status))
    ) {
      emitLocationSharingStopped({
        customerId: serviceRequest.customer,
        providerId,
        requestId: serviceRequest._id,
        status: serviceRequest.status,
      });
    }

    if (eventName === 'request:statusChanged' && serviceRequest.status === 'completed') {
      emitRequestEvent('request:completed', {
        customerId: serviceRequest.customer,
        providerId,
        requestId: serviceRequest._id,
        status: serviceRequest.status,
      });
    }

    if (['request:accepted', 'request:completed'].includes(
      eventName === 'request:statusChanged' && serviceRequest.status === 'completed'
        ? 'request:completed'
        : eventName,
    ) && providerId) {
      const provider = await User.findById(providerId).select('availabilityStatus');
      if (provider) {
        emitProviderAvailability(providerId, provider.availabilityStatus);
      }
    }
  }

  if (
    request.method === 'PATCH' &&
    request.originalUrl.split('?')[0] === '/api/providers/me' &&
    responseBody?.provider?.id
  ) {
    emitProviderAvailability(
      responseBody.provider.id,
      responseBody.provider.availabilityStatus,
    );
  }
}

function realtimeMutationMiddleware(request, response, next) {
  const originalJson = response.json.bind(response);

  response.json = (body) => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      Promise.resolve(publishSuccessfulMutation(request, body)).catch(() => {
        // The REST response remains successful even if a transient socket emit fails.
      });
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  publishSuccessfulMutation,
  realtimeMutationMiddleware,
  requestMutationEvent,
};
