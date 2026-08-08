const test = require('node:test');
const assert = require('node:assert/strict');
const { after, before } = require('node:test');
const mongoose = require('mongoose');

require('dotenv').config({ quiet: true });

const {
  getAvailableProviders,
} = require('../src/controllers/requestController');
const {
  hideCustomerRequest,
  hideProviderRequest,
} = require('../src/controllers/requestCleanupController');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');

const createdUserIds = [];
const createdRequestIds = [];
let customer;
let otherCustomer;
let matchingProvider;
let otherProvider;
let discoveryRequest;
let completedRequest;
let activeRequest;

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function createUser(values) {
  const user = await User.create({
    fullName: values.fullName,
    email: values.email,
    password: 'IntegrationPassword123',
    role: values.role,
    serviceTypes: values.serviceTypes || [],
    availabilityStatus: values.availabilityStatus || 'offline',
    providerLocation: values.providerLocation || null,
  });
  createdUserIds.push(user._id);
  return user;
}

async function createRequest(values) {
  const request = await ServiceRequest.create({
    customer: values.customer,
    provider: values.provider || null,
    serviceType: values.serviceType || 'plumber',
    description: values.description || 'Integration test service request.',
    customerLocation: {
      type: 'Point',
      coordinates: [35.5018, 33.8938],
    },
    status: values.status || 'pending',
  });
  createdRequestIds.push(request._id);
  return request;
}

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const nearLocation = { type: 'Point', coordinates: [35.5018, 33.8938] };
  const farLocation = { type: 'Point', coordinates: [36.25, 33.8938] };

  customer = await createUser({
    fullName: 'Discovery Test Customer',
    email: `discovery-customer-${suffix}@example.com`,
    role: 'customer',
  });
  otherCustomer = await createUser({
    fullName: 'Other Discovery Customer',
    email: `discovery-other-customer-${suffix}@example.com`,
    role: 'customer',
  });
  matchingProvider = await createUser({
    fullName: 'Matching Available Provider',
    email: `discovery-matching-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'available',
    providerLocation: nearLocation,
  });
  otherProvider = await createUser({
    fullName: 'Other Assigned Provider',
    email: `discovery-other-provider-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'available',
    providerLocation: nearLocation,
  });
  await createUser({
    fullName: 'Offline Matching Provider',
    email: `discovery-offline-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'offline',
    providerLocation: nearLocation,
  });
  await createUser({
    fullName: 'Busy Matching Provider',
    email: `discovery-busy-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'busy',
    providerLocation: nearLocation,
  });
  await createUser({
    fullName: 'Different Service Provider',
    email: `discovery-different-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['electrician'],
    availabilityStatus: 'available',
    providerLocation: nearLocation,
  });
  await createUser({
    fullName: 'Outside Radius Provider',
    email: `discovery-far-${suffix}@example.com`,
    role: 'provider',
    serviceTypes: ['plumber'],
    availabilityStatus: 'available',
    providerLocation: farLocation,
  });

  discoveryRequest = await createRequest({ customer: customer._id });
  completedRequest = await createRequest({
    customer: customer._id,
    provider: matchingProvider._id,
    status: 'completed',
  });
  activeRequest = await createRequest({
    customer: customer._id,
    provider: matchingProvider._id,
    status: 'accepted',
  });
});

after(async () => {
  await ServiceRequest.deleteMany({ _id: { $in: createdRequestIds } });
  await User.deleteMany({ _id: { $in: createdUserIds } });
  await mongoose.disconnect();
});

test('nearby discovery returns only available matching providers in range', async () => {
  const response = mockResponse();
  await getAvailableProviders(
    { params: { requestId: discoveryRequest.id }, user: { id: customer.id } },
    response,
  );

  assert.equal(response.statusCode, 200);
  const names = response.body.providers.map((provider) => provider.fullName);
  assert.ok(names.includes('Matching Available Provider'));
  assert.ok(names.includes('Other Assigned Provider'));
  assert.ok(!names.includes('Offline Matching Provider'));
  assert.ok(!names.includes('Busy Matching Provider'));
  assert.ok(!names.includes('Different Service Provider'));
  assert.ok(!names.includes('Outside Radius Provider'));
});

test('another customer cannot hide a customer request', async () => {
  const response = mockResponse();
  await hideCustomerRequest(
    { params: { requestId: completedRequest.id }, user: { id: otherCustomer.id } },
    response,
  );
  assert.equal(response.statusCode, 403);
  const request = await ServiceRequest.findById(completedRequest._id).lean();
  assert.notEqual(request.hiddenForCustomer, true);
});

test('another provider cannot hide an assigned provider request', async () => {
  const response = mockResponse();
  await hideProviderRequest(
    { params: { requestId: completedRequest.id }, user: { id: otherProvider.id } },
    response,
  );
  assert.equal(response.statusCode, 403);
  const request = await ServiceRequest.findById(completedRequest._id).lean();
  assert.notEqual(request.hiddenForProvider, true);
});

test('active requests cannot be hidden by either participant', async () => {
  const customerResponse = mockResponse();
  const providerResponse = mockResponse();
  await hideCustomerRequest(
    { params: { requestId: activeRequest.id }, user: { id: customer.id } },
    customerResponse,
  );
  await hideProviderRequest(
    { params: { requestId: activeRequest.id }, user: { id: matchingProvider.id } },
    providerResponse,
  );
  assert.equal(customerResponse.statusCode, 400);
  assert.equal(providerResponse.statusCode, 400);
});

test('participants hide completed requests independently', async () => {
  const customerResponse = mockResponse();
  const providerResponse = mockResponse();
  await hideCustomerRequest(
    { params: { requestId: completedRequest.id }, user: { id: customer.id } },
    customerResponse,
  );
  await hideProviderRequest(
    { params: { requestId: completedRequest.id }, user: { id: matchingProvider.id } },
    providerResponse,
  );
  assert.equal(customerResponse.statusCode, 200);
  assert.equal(providerResponse.statusCode, 200);
  const request = await ServiceRequest.findById(completedRequest._id).lean();
  assert.equal(request.hiddenForCustomer, true);
  assert.equal(request.hiddenForProvider, true);
});
