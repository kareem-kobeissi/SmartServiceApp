const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ACTIVE_TRACKING_STATUSES,
  createProviderLocationHandler,
  validateLocationPayload,
} = require('../src/realtime/providerLocationHandler');
const { formatPoint } = require('../src/controllers/trackingController');

function createHarness({ role = 'provider', persistedRequest = null } = {}) {
  const emissions = [];
  const persistenceCalls = [];
  const io = {
    to(room) {
      const rooms = [room];
      return {
        to(nextRoom) {
          rooms.push(nextRoom);
          return this;
        },
        emit(eventName, payload) {
          emissions.push({ rooms, eventName, payload });
        },
      };
    },
  };
  const handler = createProviderLocationHandler({
    io,
    now: () => Date.parse('2026-08-03T12:00:00.000Z'),
    rateLimitMs: 1000,
    persistLocation: async (input) => {
      persistenceCalls.push(input);
      return persistedRequest;
    },
  });
  const socket = { data: { user: { id: 'provider-a', role } } };
  const payload = {
    requestId: 'request-a',
    latitude: 33.8547,
    longitude: 35.8623,
    timestamp: '2026-08-03T12:00:00.000Z',
  };

  async function send(nextPayload = payload) {
    return new Promise((resolve) => handler(socket, nextPayload, resolve));
  }

  return { emissions, payload, persistenceCalls, send };
}

test('tracking lifecycle contains only accepted and active statuses', () => {
  assert.deepEqual(ACTIVE_TRACKING_STATUSES, [
    'accepted', 'on_the_way', 'arrived', 'in_progress',
  ]);
});

test('authorized assigned provider persists GeoJSON order and emits only to authorized rooms', async () => {
  const harness = createHarness({
    persistedRequest: { customer: 'customer-a', provider: 'provider-a', status: 'on_the_way' },
  });
  const result = await harness.send();

  assert.equal(result.success, true);
  assert.equal(harness.persistenceCalls.length, 1);
  assert.deepEqual(
    [harness.persistenceCalls[0].longitude, harness.persistenceCalls[0].latitude],
    [35.8623, 33.8547],
  );
  assert.deepEqual(harness.emissions[0].rooms, ['request:request-a', 'user:customer-a']);
  assert.equal(harness.emissions[0].eventName, 'provider:locationUpdated');
});

test('unassigned or completed request is rejected without broadcast', async () => {
  const harness = createHarness({ persistedRequest: null });
  const result = await harness.send();
  assert.equal(result.success, false);
  assert.match(result.message, /not assigned|no longer active/i);
  assert.equal(harness.emissions.length, 0);
});

test('customer socket and invalid coordinates are rejected', async () => {
  const customerHarness = createHarness({ role: 'customer' });
  assert.equal((await customerHarness.send()).success, false);
  assert.equal(customerHarness.persistenceCalls.length, 0);

  const providerHarness = createHarness();
  assert.equal((await providerHarness.send({ ...providerHarness.payload, latitude: 91 })).success, false);
  assert.equal(providerHarness.persistenceCalls.length, 0);
});

test('rate limiting prevents duplicate rapid persistence and broadcasts', async () => {
  const harness = createHarness({
    persistedRequest: { customer: 'customer-a', provider: 'provider-a', status: 'accepted' },
  });
  assert.equal((await harness.send()).success, true);
  assert.equal((await harness.send()).success, false);
  assert.equal(harness.persistenceCalls.length, 1);
  assert.equal(harness.emissions.length, 1);
});

test('saved GeoJSON restores as safe latitude and longitude values', () => {
  assert.deepEqual(
    formatPoint({ type: 'Point', coordinates: [35.8623, 33.8547] }),
    { longitude: 35.8623, latitude: 33.8547 },
  );
  assert.equal(formatPoint(null), null);
});

test('payload validation accepts fresh data and rejects stale timestamps', () => {
  const now = Date.parse('2026-08-03T12:00:00.000Z');
  assert.ok(validateLocationPayload({
    requestId: 'request-a', latitude: 33, longitude: 35,
    timestamp: '2026-08-03T12:00:00.000Z',
  }, now));
  assert.equal(validateLocationPayload({
    requestId: 'request-a', latitude: 33, longitude: 35,
    timestamp: '2026-08-03T11:00:00.000Z',
  }, now), null);
});
