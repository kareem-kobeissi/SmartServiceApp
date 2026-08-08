import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'smart_service_auth_token';

function getWebSessionStorage() {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  return sessionStorage;
}

export async function saveAuthToken(token) {
  if (Platform.OS === 'web') {
    const storage = getWebSessionStorage();
    if (!storage) {
      throw new Error('Session storage is unavailable.');
    }
    storage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken() {
  if (Platform.OS === 'web') {
    return getWebSessionStorage()?.getItem(AUTH_TOKEN_KEY) || null;
  }

  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function deleteAuthToken() {
  if (Platform.OS === 'web') {
    getWebSessionStorage()?.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
