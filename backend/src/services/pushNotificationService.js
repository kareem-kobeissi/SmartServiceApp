const User = require('../models/User');

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

function isValidExpoPushToken(token) {
  return typeof token === 'string' && EXPO_TOKEN_PATTERN.test(token);
}

async function removeInvalidTokens(tokens) {
  if (!tokens.length) return;
  await User.updateMany(
    { expoPushTokens: { $in: tokens } },
    { $pull: { expoPushTokens: { $in: tokens } } },
  );
}

async function sendPushNotificationToUser(userId, notification) {
  if (!userId) return { sent: 0 };

  const user = await User.findById(userId).select('+expoPushTokens');
  const tokens = [...new Set((user?.expoPushTokens || []).filter(isValidExpoPushToken))];
  if (!tokens.length) return { sent: 0 };

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    channelId: 'service-updates',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
  }));

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) throw new Error('Expo push service rejected the notification request.');
  const result = await response.json();
  const tickets = Array.isArray(result.data) ? result.data : [result.data];
  const invalidTokens = tickets
    .map((ticket, index) => ticket?.details?.error === 'DeviceNotRegistered' ? tokens[index] : null)
    .filter(Boolean);
  await removeInvalidTokens(invalidTokens);

  return { sent: tokens.length - invalidTokens.length };
}

const STATUS_MESSAGES = {
  on_the_way: 'Your provider is on the way.',
  arrived: 'Your provider has arrived.',
  in_progress: 'Your service is now in progress.',
  completed: 'Your service request has been completed.',
};

function buildRequestNotification(eventName, serviceRequest) {
  const requestId = String(serviceRequest._id);
  const data = { event: eventName, requestId };

  if (eventName === 'request:offered' && serviceRequest.provider) {
    return { userId: serviceRequest.provider, title: 'New Service Request', body: 'A customer selected you for a service request.', data };
  }
  if (eventName === 'request:accepted') {
    return { userId: serviceRequest.customer, title: 'Request Accepted', body: 'Your service request has been accepted.', data };
  }
  if (eventName === 'request:rejected') {
    return { userId: serviceRequest.customer, title: 'Request Rejected', body: 'Your service request was rejected.', data };
  }
  if (eventName === 'request:statusChanged' && serviceRequest.status === 'cancelled' && serviceRequest.provider) {
    return { userId: serviceRequest.provider, title: 'Request Cancelled', body: 'The customer cancelled the service request.', data: { ...data, status: serviceRequest.status } };
  }
  if (eventName === 'request:statusChanged' && STATUS_MESSAGES[serviceRequest.status]) {
    return { userId: serviceRequest.customer, title: 'Service Status Updated', body: STATUS_MESSAGES[serviceRequest.status], data: { ...data, status: serviceRequest.status } };
  }
  return null;
}

async function sendRequestMutationNotification(eventName, serviceRequest) {
  const notification = buildRequestNotification(eventName, serviceRequest);
  if (!notification) return { sent: 0 };
  return sendPushNotificationToUser(notification.userId, notification);
}

module.exports = {
  buildRequestNotification,
  isValidExpoPushToken,
  sendPushNotificationToUser,
  sendRequestMutationNotification,
};
