const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '')
  : '';
