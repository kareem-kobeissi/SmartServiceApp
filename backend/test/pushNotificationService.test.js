const assert = require('node:assert/strict');
const test = require('node:test');

const User = require('../src/models/User');
const {
  buildRequestNotification,
  isValidExpoPushToken,
  sendPushNotificationToUser,
} = require('../src/services/pushNotificationService');

const request = {
  _id: 'request-1',
  customer: 'customer-1',
  provider: 'provider-1',
};

test('builds the provider offer notification', () => {
  const notification = buildRequestNotification('request:offered', request);
  assert.equal(notification.userId, 'provider-1');
  assert.equal(notification.title, 'New Service Request');
});

test('builds customer acceptance and rejection notifications', () => {
  assert.equal(
    buildRequestNotification('request:accepted', request).body,
    'Your service request has been accepted.',
  );
  assert.equal(
    buildRequestNotification('request:rejected', request).body,
    'Your service request was rejected.',
  );
});

for (const [status, expectedBody] of Object.entries({
  on_the_way: 'Your provider is on the way.',
  arrived: 'Your provider has arrived.',
  in_progress: 'Your service is now in progress.',
  completed: 'Your service request has been completed.',
})) {
  test(`builds the ${status} lifecycle notification`, () => {
    const notification = buildRequestNotification('request:statusChanged', {
      ...request,
      status,
    });
    assert.equal(notification.userId, 'customer-1');
    assert.equal(notification.body, expectedBody);
  });
}

test('ignores unrelated events and validates Expo tokens', () => {
  assert.equal(buildRequestNotification('request:rated', request), null);
  assert.equal(isValidExpoPushToken('ExpoPushToken[valid_token-123]'), true);
  assert.equal(isValidExpoPushToken('not-a-push-token'), false);
});

test('deduplicates device tokens before sending', async (context) => {
  const token = 'ExpoPushToken[duplicate-token]';
  const originalFindById = User.findById;
  const originalFetch = global.fetch;
  let sentMessages;

  context.after(() => {
    User.findById = originalFindById;
    global.fetch = originalFetch;
  });

  User.findById = () => ({
    select: async () => ({ expoPushTokens: [token, token] }),
  });
  global.fetch = async (_url, options) => {
    sentMessages = JSON.parse(options.body);
    return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }) };
  };

  const result = await sendPushNotificationToUser('provider-1', {
    title: 'New Service Request',
    body: 'A customer selected you for a service request.',
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(result.sent, 1);
});
