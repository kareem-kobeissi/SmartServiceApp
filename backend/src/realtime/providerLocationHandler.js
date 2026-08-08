const ServiceRequest = require('../models/ServiceRequest');
const { requestRoom, userRoom } = require('./socketServerRooms');

const ACTIVE_TRACKING_STATUSES = ['accepted', 'on_the_way', 'arrived', 'in_progress'];
const DEFAULT_RATE_LIMIT_MS = 4000;
const MAX_TIMESTAMP_AGE_MS = 10 * 60 * 1000;
const MAX_TIMESTAMP_FUTURE_MS = 60 * 1000;

function validateLocationPayload(payload, now = Date.now()) {
  const latitude = payload?.latitude;
  const longitude = payload?.longitude;
  const recordedAt = new Date(payload?.timestamp);
  if (
    typeof payload?.requestId !== 'string' || !payload.requestId.trim() ||
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    Number.isNaN(recordedAt.getTime()) ||
    recordedAt.getTime() < now - MAX_TIMESTAMP_AGE_MS ||
    recordedAt.getTime() > now + MAX_TIMESTAMP_FUTURE_MS
  ) return null;
  return { requestId: payload.requestId.trim(), latitude, longitude, recordedAt };
}

async function persistProviderLocation({ requestId, providerId, latitude, longitude, recordedAt }) {
  return ServiceRequest.findOneAndUpdate(
    {
      _id: requestId,
      provider: providerId,
      status: { $in: ACTIVE_TRACKING_STATUSES },
      locationSharingActive: true,
    },
    {
      $set: {
        lastProviderLocation: { type: 'Point', coordinates: [longitude, latitude] },
        lastProviderLocationUpdatedAt: recordedAt,
      },
    },
    { new: true, runValidators: true },
  ).select('customer provider status locationSharingActive lastProviderLocationUpdatedAt');
}

async function persistSharingStart({ requestId, providerId, changedAt }) {
  return ServiceRequest.findOneAndUpdate(
    { _id: requestId, provider: providerId, status: { $in: ACTIVE_TRACKING_STATUSES } },
    {
      $set: {
        locationSharingActive: true,
        locationSharingStartedAt: changedAt,
        locationSharingStoppedAt: null,
        lastProviderLocation: null,
        lastProviderLocationUpdatedAt: null,
      },
    },
    { new: true },
  ).select('customer provider status locationSharingActive locationSharingStartedAt');
}

async function persistSharingStop({ requestId, providerId, changedAt }) {
  return ServiceRequest.findOneAndUpdate(
    { _id: requestId, provider: providerId, status: { $in: ACTIVE_TRACKING_STATUSES } },
    {
      $set: {
        locationSharingActive: false,
        locationSharingStoppedAt: changedAt,
        lastProviderLocation: null,
        lastProviderLocationUpdatedAt: null,
      },
    },
    { new: true },
  ).select('customer provider status locationSharingActive locationSharingStoppedAt');
}

async function persistSharingStopAll({ providerId, changedAt }) {
  const requests = await ServiceRequest.find({
    provider: providerId,
    locationSharingActive: true,
    status: { $in: ACTIVE_TRACKING_STATUSES },
  }).select('customer provider status');
  if (!requests.length) return [];
  await ServiceRequest.updateMany(
    { _id: { $in: requests.map((request) => request._id) }, provider: providerId },
    {
      $set: {
        locationSharingActive: false,
        locationSharingStoppedAt: changedAt,
        lastProviderLocation: null,
        lastProviderLocationUpdatedAt: null,
      },
    },
  );
  return requests;
}

function emitSharingEvent(io, eventName, serviceRequest, changedAt) {
  const payload = {
    requestId: String(serviceRequest._id || serviceRequest.id),
    status: serviceRequest.status,
    timestamp: changedAt.toISOString(),
  };
  io.to(requestRoom(payload.requestId))
    .to(userRoom(serviceRequest.customer))
    .emit(eventName, payload);
  return payload;
}

function createProviderLocationHandlers({
  io,
  persistLocation = persistProviderLocation,
  startSharing = persistSharingStart,
  stopSharing = persistSharingStop,
  stopAllSharing = persistSharingStopAll,
  rateLimitMs = DEFAULT_RATE_LIMIT_MS,
  now = () => Date.now(),
} = {}) {
  async function handleProviderLocation(socket, payload, acknowledge = () => {}) {
    if (socket.data.user?.role !== 'provider') {
      acknowledge({ success: false, message: 'Provider access is required.' });
      return;
    }
    const validated = validateLocationPayload(payload, now());
    if (!validated) {
      acknowledge({ success: false, message: 'Valid coordinates and timestamp are required.' });
      return;
    }
    const rateKey = `location:${validated.requestId}`;
    if (now() - (socket.data[rateKey] || 0) < rateLimitMs) {
      acknowledge({ success: false, message: 'Location updates are being sent too quickly.' });
      return;
    }
    try {
      const serviceRequest = await persistLocation({ ...validated, providerId: socket.data.user.id });
      if (!serviceRequest) {
        acknowledge({ success: false, message: 'Location sharing is stopped or this request is not assigned to you.' });
        return;
      }
      socket.data[rateKey] = now();
      const safeUpdate = {
        requestId: validated.requestId,
        latitude: validated.latitude,
        longitude: validated.longitude,
        timestamp: validated.recordedAt.toISOString(),
        status: serviceRequest.status,
      };
      io.to(requestRoom(validated.requestId)).to(userRoom(serviceRequest.customer))
        .emit('provider:locationUpdated', safeUpdate);
      acknowledge({ success: true, update: safeUpdate });
    } catch {
      acknowledge({ success: false, message: 'Unable to save the provider location.' });
    }
  }

  async function handleSharingStart(socket, payload, acknowledge = () => {}) {
    if (socket.data.user?.role !== 'provider' || typeof payload?.requestId !== 'string') {
      acknowledge({ success: false, message: 'Provider access and a request ID are required.' });
      return;
    }
    try {
      const changedAt = new Date(now());
      const serviceRequest = await startSharing({
        requestId: payload.requestId.trim(), providerId: socket.data.user.id, changedAt,
      });
      if (!serviceRequest) {
        acknowledge({ success: false, message: 'This active request is not assigned to you.' });
        return;
      }
      const update = emitSharingEvent(io, 'provider:locationSharingStarted', serviceRequest, changedAt);
      acknowledge({ success: true, update });
    } catch {
      acknowledge({ success: false, message: 'Unable to start location sharing.' });
    }
  }

  async function handleSharingStop(socket, payload, acknowledge = () => {}) {
    if (socket.data.user?.role !== 'provider' || typeof payload?.requestId !== 'string') {
      acknowledge({ success: false, message: 'Provider access and a request ID are required.' });
      return;
    }
    try {
      const changedAt = new Date(now());
      const serviceRequest = await stopSharing({
        requestId: payload.requestId.trim(), providerId: socket.data.user.id, changedAt,
      });
      if (!serviceRequest) {
        acknowledge({ success: false, message: 'This active request is not assigned to you.' });
        return;
      }
      const update = emitSharingEvent(io, 'provider:locationSharingStopped', serviceRequest, changedAt);
      acknowledge({ success: true, update });
    } catch {
      acknowledge({ success: false, message: 'Unable to stop location sharing.' });
    }
  }

  async function handleSharingStopAll(socket, acknowledge = () => {}) {
    if (socket.data.user?.role !== 'provider') {
      acknowledge({ success: false, message: 'Provider access is required.' });
      return;
    }
    try {
      const changedAt = new Date(now());
      const requests = await stopAllSharing({ providerId: socket.data.user.id, changedAt });
      requests.forEach((serviceRequest) =>
        emitSharingEvent(io, 'provider:locationSharingStopped', serviceRequest, changedAt));
      acknowledge({ success: true, stoppedCount: requests.length });
    } catch {
      acknowledge({ success: false, message: 'Unable to stop location sharing.' });
    }
  }

  return { handleProviderLocation, handleSharingStart, handleSharingStop, handleSharingStopAll };
}

function createProviderLocationHandler(options) {
  return createProviderLocationHandlers(options).handleProviderLocation;
}

module.exports = {
  ACTIVE_TRACKING_STATUSES,
  createProviderLocationHandler,
  createProviderLocationHandlers,
  emitSharingEvent,
  persistProviderLocation,
  persistSharingStart,
  persistSharingStop,
  persistSharingStopAll,
  validateLocationPayload,
};