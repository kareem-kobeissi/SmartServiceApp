const ServiceRequest = require('../models/ServiceRequest');

const ACTIVE_PROVIDER_WORK_STATUSES = [
  'accepted',
  'on_the_way',
  'arrived',
  'in_progress',
];

async function hasActiveProviderRequest(
  providerId,
  { excludeRequestId = null, session = null } = {},
) {
  const filter = {
    provider: providerId,
    status: { $in: ACTIVE_PROVIDER_WORK_STATUSES },
    ...(excludeRequestId ? { _id: { $ne: excludeRequestId } } : {}),
  };
  let query = ServiceRequest.exists(filter);
  if (session) query = query.session(session);
  return Boolean(await query);
}

function hasDiscoverableProviderProfile(provider) {
  return Boolean(
    provider &&
      Array.isArray(provider.serviceTypes) &&
      provider.serviceTypes.length > 0 &&
      provider.providerLocation,
  );
}

module.exports = {
  ACTIVE_PROVIDER_WORK_STATUSES,
  hasActiveProviderRequest,
  hasDiscoverableProviderProfile,
};
