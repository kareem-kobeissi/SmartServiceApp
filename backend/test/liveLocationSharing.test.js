const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  createProviderLocationHandlers,
  persistSharingStop,
} = require('../src/realtime/providerLocationHandler');
const ServiceRequest = require('../src/models/ServiceRequest');
const {
  buildLifecycleStatusSet,
} = require('../src/controllers/providerRequestController');

const fixedTime = Date.parse('2026-08-03T12:00:00.000Z');

function sharingHarness() {
  const emissions = [];
  const calls = { start: [], stop: [], location: [] };
  const request = {
    _id: 'request-a',
    customer: 'customer-a',
    provider: 'provider-a',
    status: 'on_the_way',
  };
  const io = {
    to(room) {
      const rooms = [room];
      return {
        to(nextRoom) { rooms.push(nextRoom); return this; },
        emit(eventName, payload) { emissions.push({ rooms, eventName, payload }); },
      };
    },
  };
  const handlers = createProviderLocationHandlers({
    io,
    now: () => fixedTime,
    rateLimitMs: 0,
    startSharing: async (input) => { calls.start.push(input); return request; },
    stopSharing: async (input) => { calls.stop.push(input); return request; },
    persistLocation: async (input) => { calls.location.push(input); return request; },
    stopAllSharing: async () => [request],
  });
  const socket = { data: { user: { id: 'provider-a', role: 'provider' } } };
  const run = (handler, payload) => new Promise((resolve) => handler(socket, payload, resolve));
  return { calls, emissions, handlers, request, run, socket };
}

test('start sharing emits only to the authorized request and customer rooms', async () => {
  const harness = sharingHarness();
  const result = await harness.run(harness.handlers.handleSharingStart, { requestId: 'request-a' });
  assert.equal(result.success, true);
  assert.equal(harness.calls.start[0].providerId, 'provider-a');
  assert.deepEqual(harness.emissions[0].rooms, ['request:request-a', 'user:customer-a']);
  assert.equal(harness.emissions[0].eventName, 'provider:locationSharingStarted');
});

test('location update moves the provider only through authorized rooms', async () => {
  const harness = sharingHarness();
  const result = await harness.run(harness.handlers.handleProviderLocation, {
    requestId: 'request-a', latitude: 33.85, longitude: 35.86,
    timestamp: '2026-08-03T12:00:00.000Z',
  });
  assert.equal(result.success, true);
  assert.equal(harness.emissions[0].eventName, 'provider:locationUpdated');
  assert.equal(harness.emissions[0].payload.latitude, 33.85);
  assert.deepEqual(harness.emissions[0].rooms, ['request:request-a', 'user:customer-a']);
});

test('stop sharing emits immediately and the persistence update clears MongoDB location fields', async () => {
  const harness = sharingHarness();
  const result = await harness.run(harness.handlers.handleSharingStop, { requestId: 'request-a' });
  assert.equal(result.success, true);
  assert.equal(harness.emissions[0].eventName, 'provider:locationSharingStopped');

  const original = ServiceRequest.findOneAndUpdate;
  let capturedUpdate;
  ServiceRequest.findOneAndUpdate = (_filter, update) => {
    capturedUpdate = update;
    return { select: async () => harness.request };
  };
  try {
    await persistSharingStop({
      requestId: 'request-a', providerId: 'provider-a', changedAt: new Date(fixedTime),
    });
  } finally {
    ServiceRequest.findOneAndUpdate = original;
  }
  assert.equal(capturedUpdate.$set.locationSharingActive, false);
  assert.equal(capturedUpdate.$set.lastProviderLocation, null);
  assert.equal(capturedUpdate.$set.lastProviderLocationUpdatedAt, null);
});

test('completion atomically stops sharing and clears the latest location', () => {
  const update = buildLifecycleStatusSet('completed', new Date(fixedTime));
  assert.equal(update.status, 'completed');
  assert.equal(update.locationSharingActive, false);
  assert.equal(update.lastProviderLocation, null);
  assert.equal(update.lastProviderLocationUpdatedAt, null);
  assert.equal(update.locationSharingStoppedAt.toISOString(), '2026-08-03T12:00:00.000Z');
});

test('unassigned provider and unrelated customer receive no location event', async () => {
  const harness = sharingHarness();
  harness.socket.data.user.role = 'customer';
  const result = await harness.run(harness.handlers.handleProviderLocation, {
    requestId: 'request-a', latitude: 33.85, longitude: 35.86,
    timestamp: '2026-08-03T12:00:00.000Z',
  });
  assert.equal(result.success, false);
  assert.equal(harness.emissions.length, 0);
});

test('mobile source hides stale locations after 30 seconds and contains no simulator controls', () => {
  const screen = fs.readFileSync(
    path.resolve(__dirname, '../../src/screens/TrackingScreen.js'), 'utf8',
  );
  assert.match(screen, /LOCATION_STALE_MS = 30000/);
  assert.match(screen, /Provider location is temporarily unavailable/);
  for (const removed of ['simulateMove', 'simulatedLocation', '>North<', '>South<', '>East<', '>West<']) {
    assert.equal(screen.includes(removed), false);
  }
});

test('web and Android maps use equivalent markers, labels, dimensions and line presentation', () => {
  const web = fs.readFileSync(path.resolve(__dirname, '../../src/components/TrackingMap.web.js'), 'utf8');
  const native = fs.readFileSync(path.resolve(__dirname, '../../src/components/TrackingMap.native.js'), 'utf8');
  for (const value of ['#2563eb', '#dc2626', '#64748b', 'Customer', 'Provider', '360']) {
    assert.equal(web.includes(value), true, `web map missing ${value}`);
    assert.equal(native.includes(value), true, `native map missing ${value}`);
  }
  assert.match(web, /weight: 3/);
  assert.match(native, /strokeWidth=\{3\}/);
  assert.match(web, /fitBounds/);
  assert.match(native, /fitToCoordinates/);
});
