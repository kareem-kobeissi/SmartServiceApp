const User = require('../models/User');
const { isValidExpoPushToken } = require('../services/pushNotificationService');

async function registerPushToken(request, response) {
  const { token } = request.body;
  if (!isValidExpoPushToken(token)) {
    return response.status(400).json({ success: false, message: 'A valid Expo push token is required.' });
  }
  try {
    await User.updateMany({ expoPushTokens: token, _id: { $ne: request.user.id } }, { $pull: { expoPushTokens: token } });
    const user = await User.findByIdAndUpdate(request.user.id, { $addToSet: { expoPushTokens: token } }, { new: true });
    if (!user) return response.status(404).json({ success: false, message: 'User account not found.' });
    return response.status(200).json({ success: true, message: 'Push notifications registered.' });
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to register push notifications.' });
  }
}

async function unregisterPushToken(request, response) {
  const { token } = request.body;
  if (!isValidExpoPushToken(token)) {
    return response.status(400).json({ success: false, message: 'A valid Expo push token is required.' });
  }
  try {
    await User.updateOne({ _id: request.user.id }, { $pull: { expoPushTokens: token } });
    return response.status(200).json({ success: true, message: 'Push notifications unregistered.' });
  } catch {
    return response.status(500).json({ success: false, message: 'Unable to unregister push notifications.' });
  }
}

module.exports = { registerPushToken, unregisterPushToken };
