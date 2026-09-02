const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

require('dotenv').config({ quiet: true });

const {
  cancelServiceRequest,
} = require('../src/controllers/requestController');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');

const userIds = [];
const requestIds = [];
let customer;
let otherCustomer;
let provider;

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function createRequest(status) {
  const serviceRequest = await ServiceRequest.create({
    customer: customer._id,
    provider: status === 'pending' ? null : provider._id,
    serviceType: 'electrician',
    description: 'Customer cancellation integration test request.',
    customerLocation: { type: 'Point', coordinates: [35.5018, 33.8938] },
    status,
    locationSharingActive: status === 'in_progress',
    lastProviderLocation:
      status === 'in_progress'
        ? { type: 'Point', coordinates: [35.502, 33.894] }
        : null,
    lastProviderLocationUpdatedAt:
      status === 'in_progress' ? new Date() : null,
  });
  requestIds.push(serviceRequest._id);
  return serviceRequest;
}

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  customer = await User.create({
    fullName: 'Cancellation Test Customer',
    email: `cancel-customer-${suffix}@example.com`,
    password: 'IntegrationPassword123',
    role: 'customer',
  });
  otherCustomer = await User.create({
    fullName: 'Other Cancellation Customer',
    email: `cancel-other-${suffix}@example.com`,
    password: 'IntegrationPassword123',
    role: 'customer',
  });
  provider = await User.create({
    fullName: 'Cancellation Test Provider',
    email: `cancel-provider-${suffix}@example.com`,
    password: 'IntegrationPassword123',
    role: 'provider',
    serviceTypes: ['electrician'],
    availabilityStatus: 'busy',
    providerLocation: { type: 'Point', coordinates: [35.5018, 33.8938] },
  });
  userIds.push(customer._id, otherCustomer._id, provider._id);
});

test.after(async () => {
  await ServiceRequest.deleteMany({ _id: { $in: requestIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  await mongoose.disconnect();
});

test('customer cancels an active request atomically and provider becomes available', async () => {
  const serviceRequest = await createRequest('in_progress');
  const response = responseMock();
  await cancelServiceRequest(
    { params: { requestId: serviceRequest.id }, user: { id: customer.id } },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cancellationFee, 10);
  assert.equal(response.body.request.status, 'cancelled');

  const [savedRequest, savedProvider] = await Promise.all([
    ServiceRequest.findById(serviceRequest._id).lean(),
    User.findById(provider._id).lean(),
  ]);
  assert.equal(savedRequest.status, 'cancelled');
  assert.equal(savedRequest.locationSharingActive, false);
  assert.equal(savedRequest.lastProviderLocation, null);
  assert.equal(savedProvider.availabilityStatus, 'available');
});

test('another customer cannot cancel the request', async () => {
  const serviceRequest = await createRequest('pending');
  const response = responseMock();
  await cancelServiceRequest(
    { params: { requestId: serviceRequest.id }, user: { id: otherCustomer.id } },
    response,
  );
  assert.equal(response.statusCode, 404);
  const savedRequest = await ServiceRequest.findById(serviceRequest._id).lean();
  assert.equal(savedRequest.status, 'pending');
});

test('completed requests cannot be cancelled', async () => {
  const serviceRequest = await createRequest('completed');
  const response = responseMock();
  await cancelServiceRequest(
    { params: { requestId: serviceRequest.id }, user: { id: customer.id } },
    response,
  );
  assert.equal(response.statusCode, 409);
  const savedRequest = await ServiceRequest.findById(serviceRequest._id).lean();
  assert.equal(savedRequest.status, 'completed');
});
