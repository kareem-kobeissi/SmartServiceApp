const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

require('dotenv').config({ quiet: true });

const {
  updateMyProviderProfile,
} = require('../src/controllers/providerController');
const {
  updateProviderRequestStatus,
} = require('../src/controllers/providerRequestController');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');
const {
  persistSharingStop,
} = require('../src/realtime/providerLocationHandler');

const userIds = [];
const requestIds = [];
let customer;
let provider;
let firstActiveRequest;
let secondActiveRequest;

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  customer = await User.create({
    fullName: 'Availability Test Customer',
    email: `availability-customer-${suffix}@example.com`,
    password: 'IntegrationPassword123',
    role: 'customer',
  });
  provider = await User.create({
    fullName: 'Availability Test Provider',
    email: `availability-provider-${suffix}@example.com`,
    password: 'IntegrationPassword123',
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'busy',
    providerLocation: { type: 'Point', coordinates: [35.5018, 33.8938] },
  });
  userIds.push(customer._id, provider._id);
  const base = {
    customer: customer._id,
    provider: provider._id,
    serviceType: 'plumber',
    description: 'Availability regression test request.',
    customerLocation: { type: 'Point', coordinates: [35.5018, 33.8938] },
    status: 'in_progress',
  };
  firstActiveRequest = await ServiceRequest.create(base);
  secondActiveRequest = await ServiceRequest.create(base);
  requestIds.push(firstActiveRequest._id, secondActiveRequest._id);
});

test.after(async () => {
  await ServiceRequest.deleteMany({ _id: { $in: requestIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  await mongoose.disconnect();
});

test('provider cannot manually become available while active work exists', async () => {
  const response = responseMock();
  await updateMyProviderProfile(
    {
      user: { id: provider.id },
      body: { availabilityStatus: 'available' },
    },
    response,
  );
  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /active request/i);
});

test('completing one of multiple active requests keeps provider busy', async () => {
  const response = responseMock();
  await updateProviderRequestStatus(
    {
      user: { id: provider.id },
      params: { requestId: firstActiveRequest.id },
      body: { status: 'completed' },
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  const refreshedProvider = await User.findById(provider._id).lean();
  assert.equal(refreshedProvider.availabilityStatus, 'busy');
});

test('completing the final active request restores available status', async () => {
  const response = responseMock();
  await updateProviderRequestStatus(
    {
      user: { id: provider.id },
      params: { requestId: secondActiveRequest.id },
      body: { status: 'completed' },
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  const refreshedProvider = await User.findById(provider._id).lean();
  assert.equal(refreshedProvider.availabilityStatus, 'available');
});

test('stopping live sharing clears only request location and preserves provider profile location', async () => {
  const request = await ServiceRequest.create({
    customer: customer._id,
    provider: provider._id,
    serviceType: 'plumber',
    description: 'Live sharing profile-location regression test.',
    customerLocation: { type: 'Point', coordinates: [35.5018, 33.8938] },
    status: 'accepted',
    locationSharingActive: true,
    lastProviderLocation: { type: 'Point', coordinates: [35.51, 33.9] },
    lastProviderLocationUpdatedAt: new Date(),
  });
  requestIds.push(request._id);
  const before = await User.findById(provider._id).select('providerLocation').lean();
  await persistSharingStop({
    requestId: request.id,
    providerId: provider.id,
    changedAt: new Date(),
  });
  const [savedRequest, savedProvider] = await Promise.all([
    ServiceRequest.findById(request._id).lean(),
    User.findById(provider._id).select('providerLocation').lean(),
  ]);
  assert.equal(savedRequest.lastProviderLocation, null);
  assert.equal(savedRequest.lastProviderLocationUpdatedAt, null);
  assert.deepEqual(savedProvider.providerLocation, before.providerLocation);
});
