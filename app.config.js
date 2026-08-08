const appJson = require('./app.json');

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      ...(process.env.GOOGLE_MAPS_API_KEY
        ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } }
        : {}),
    },
  },
});
