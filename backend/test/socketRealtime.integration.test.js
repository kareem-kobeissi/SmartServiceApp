const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const express = require('express');
const jwt = require('jsonwebtoken');
const { io: createClient } = require('socket.io-client');

const {
  emitProviderAvailability,
  emitRequestEvent,
  removeUserFromRequestRoom,
  setSocketServer,
} = require('../src/realtime/realtimeEvents');
const {
  configureSocketServer,
} = require('../src/realtime/socketServer');
const {
  requestMutationEvent,
} = require('../src/middleware/realtimeMiddleware');

const JWT_SECRET = 'socket-test-secret-with-sufficient-length';
const CUSTOMER_ID = 'customer-test-id';
const PROVIDER_ID = 'provider-test-id';
const OTHER_USER_ID = 'other-user-id';
const REQUEST_ID = 'request-test-id';

let httpServer;
let io;
let serverUrl;
const clients = new Set();

function tokenFor(userId, role, expiresIn = '1h') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn });
}

function connectClient(token, options = {}) {
  const client = createClient(serverUrl, {
    auth: token === undefined ? {} : { token },
    reconnection: options.reconnection ?? false,
    transports: ['websocket'],
  });
  clients.add(client);
  return client;
}

function once(socket, eventName) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${eventName}`)),
      3000,
    );
    socket.once(eventName, (...args) => {
      clearTimeout(timeout);
      resolve(args);
    });
  });
}

async function connectAuthenticated(userId, role) {
  const client = connectClient(tokenFor(userId, role));
  await once(client, 'connect');
  return client;
}

function expectNoEvent(socket, eventName, durationMs = 150) {
  return new Promise((resolve, reject) => {
    const handler = () => {
      clearTimeout(timeout);
      reject(new Error(`Unexpected  event`));
    };
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      resolve();
    }, durationMs);
    socket.once(eventName, handler);
  });
}

test.before(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  httpServer = http.createServer(express());
  io = configureSocketServer(httpServer, {
    authorizeRequestRoom: async (requestId, user) =>
      requestId === REQUEST_ID &&
      [CUSTOMER_ID, PROVIDER_ID].includes(user.id),
  });
  setSocketServer(io);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  serverUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

test.after(async () => {
  clients.forEach((client) => client.disconnect());
  setSocketServer(null);
  await new Promise((resolve) => io.close(resolve));
  if (httpServer.listening) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

test('invalid and missing JWT socket connections are rejected', async () => {
  for (const token of [undefined, 'not-a-jwt', tokenFor(CUSTOMER_ID, 'customer', '-1s')]) {
    const client = connectClient(token);
    const [error] = await once(client, 'connect_error');
    assert.match(error.message, /Authentication|Invalid or expired/);
    assert.equal(client.connected, false);
    client.disconnect();
  }
});

test('only the authorized customer or provider can join a request room', async () => {
  const customer = await connectAuthenticated(CUSTOMER_ID, 'customer');
  const other = await connectAuthenticated(OTHER_USER_ID, 'customer');

  const customerAck = await new Promise((resolve) =>
    customer.emit('request:join', REQUEST_ID, resolve),
  );
  const otherAck = await new Promise((resolve) =>
    other.emit('request:join', REQUEST_ID, resolve),
  );

  assert.equal(customerAck.success, true);
  assert.equal(otherAck.success, false);
  assert.match(otherAck.message, /cannot access/);
});

test('customer immediately receives acceptance and every lifecycle status', async () => {
  const customer = await connectAuthenticated(CUSTOMER_ID, 'customer');

  const accepted = once(customer, 'request:accepted');
  emitRequestEvent('request:accepted', {
    customerId: CUSTOMER_ID,
    providerId: PROVIDER_ID,
    requestId: REQUEST_ID,
    status: 'accepted',
  });
  assert.equal((await accepted)[0].status, 'accepted');

  for (const status of ['on_the_way', 'arrived', 'in_progress', 'completed']) {
    const eventName = status === 'completed' ? 'request:completed' : 'request:statusChanged';
    const received = once(customer, eventName);
    emitRequestEvent(eventName, {
      customerId: CUSTOMER_ID,
      providerId: PROVIDER_ID,
      requestId: REQUEST_ID,
      status,
    });
    const [payload] = await received;
    assert.deepEqual(payload, { requestId: REQUEST_ID, status });
  }
});

test('provider immediately sees a new offer and rejection updates both participants', async () => {
  const customer = await connectAuthenticated(CUSTOMER_ID, 'customer');
  const provider = await connectAuthenticated(PROVIDER_ID, 'provider');

  const offered = once(provider, 'request:offered');
  emitRequestEvent('request:offered', {
    customerId: CUSTOMER_ID,
    providerId: PROVIDER_ID,
    requestId: REQUEST_ID,
    status: 'offered',
  });
  assert.equal((await offered)[0].requestId, REQUEST_ID);

  const customerRejected = once(customer, 'request:rejected');
  const providerRejected = once(provider, 'request:rejected');
  emitRequestEvent('request:rejected', {
    customerId: CUSTOMER_ID,
    providerId: PROVIDER_ID,
    requestId: REQUEST_ID,
    status: 'rejected',
  });
  assert.equal((await customerRejected)[0].status, 'rejected');
  assert.equal((await providerRejected)[0].status, 'rejected');
});

test('reconnection does not duplicate updates or alter provider availability', async () => {
  const provider = await connectAuthenticated(PROVIDER_ID, 'provider');
  let updateCount = 0;
  provider.on('request:offered', () => {
    updateCount += 1;
  });

  provider.disconnect();
  provider.connect();
  await once(provider, 'connect');

  emitRequestEvent('request:offered', {
    customerId: CUSTOMER_ID,
    providerId: PROVIDER_ID,
    requestId: REQUEST_ID,
    status: 'offered',
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(updateCount, 1);

  const availabilityEvent = once(provider, 'provider:availabilityChanged');
  emitProviderAvailability(PROVIDER_ID, 'available');
  assert.equal((await availabilityEvent)[0].availabilityStatus, 'available');
  assert.equal(updateCount, 1);
});

test('a rejected provider is removed from the request room', async () => {
  const provider = await connectAuthenticated(PROVIDER_ID, 'provider');
  const joinAck = await new Promise((resolve) =>
    provider.emit('request:join', REQUEST_ID, resolve),
  );
  assert.equal(joinAck.success, true);

  removeUserFromRequestRoom(PROVIDER_ID, REQUEST_ID);
  const noLaterUpdate = expectNoEvent(provider, 'request:statusChanged');
  emitRequestEvent('request:statusChanged', {
    customerId: CUSTOMER_ID,
    requestId: REQUEST_ID,
    status: 'accepted',
  });
  await noLaterUpdate;
});
test('REST mutations map to all required real-time request events', () => {
  const cases = [
    ['POST', '/api/requests', {}, 'request:created'],
    ['PATCH', '/api/requests/id/select-provider', {}, 'request:offered'],
    ['PATCH', '/api/provider-requests/id/respond', { action: 'accept' }, 'request:accepted'],
    ['PATCH', '/api/provider-requests/id/respond', { action: 'reject' }, 'request:rejected'],
    ['PATCH', '/api/provider-requests/id/status', {}, 'request:statusChanged'],
    ['POST', '/api/requests/id/rating', {}, 'request:rated'],
    ['PATCH', '/api/requests/id/hide', {}, 'request:hidden'],
  ];

  cases.forEach(([method, originalUrl, body, expected]) => {
    assert.equal(requestMutationEvent({ method, originalUrl, body }, {}), expected);
  });
});
