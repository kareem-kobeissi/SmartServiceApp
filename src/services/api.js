import { API_BASE_URL } from '../constants/config';
import { getAuthToken } from './tokenStorage';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError(
      'The API URL is not configured. Add EXPO_PUBLIC_API_URL and reload the app.',
    );
  }

  let response;
  const { headers = {}, ...requestOptions } = options;
  const isFormData =
    typeof FormData !== 'undefined' &&
    requestOptions.body instanceof FormData;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      'Unable to reach Smart Service. Check the server and network connection.',
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'Unable to create the account.',
      response.status,
    );
  }

  return data;
}

export function registerUser(registrationData) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(registrationData),
  });
}

export function loginUser(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(token) {
  return apiRequest('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getStoredAuthorizationHeader() {
  const token = await getAuthToken();

  if (!token) {
    throw new ApiError('Authentication is required.', 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getProviderProfile() {
  return apiRequest('/api/providers/me', {
    method: 'GET',
    headers: await getStoredAuthorizationHeader(),
  });
}

export async function updateProviderProfile(profileUpdates) {
  return apiRequest('/api/providers/me', {
    method: 'PATCH',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify(profileUpdates),
  });
}

export async function updateProviderLocation(coordinates) {
  return apiRequest('/api/providers/location', {
    method: 'PATCH',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify(coordinates),
  });
}

export async function createServiceRequest(requestData, imageAsset = null) {
  if (imageAsset) {
    const formData = new FormData();
    Object.entries(requestData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    if (imageAsset.file) {
      formData.append('image', imageAsset.file);
    } else {
      formData.append('image', {
        uri: imageAsset.uri,
        name:
          imageAsset.fileName ||
          `service-request.${imageAsset.mimeType?.split('/')[1] || 'jpg'}`,
        type: imageAsset.mimeType || 'image/jpeg',
      });
    }

    return apiRequest('/api/requests', {
      method: 'POST',
      headers: await getStoredAuthorizationHeader(),
      body: formData,
    });
  }

  return apiRequest('/api/requests', {

    method: 'POST',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify(requestData),
  });
}

export async function getMyServiceRequests() {
  return apiRequest('/api/requests/my', {
    method: 'GET',
    headers: await getStoredAuthorizationHeader(),
  });
}

export async function getAvailableProviders(requestId) {
  return apiRequest(
    `/api/requests/${encodeURIComponent(requestId)}/available-providers`,
    {
      method: 'GET',
      headers: await getStoredAuthorizationHeader(),
    },
  );
}

export async function selectRequestProvider(requestId, providerId) {
  return apiRequest(
    `/api/requests/${encodeURIComponent(requestId)}/select-provider`,
    {
      method: 'PATCH',
      headers: await getStoredAuthorizationHeader(),
      body: JSON.stringify({ providerId }),
    },
  );
}

export async function getProviderRequests() {
  return apiRequest('/api/provider-requests', {
    method: 'GET',
    headers: await getStoredAuthorizationHeader(),
  });
}

export async function respondToProviderRequest(requestId, action) {
  return apiRequest(
    `/api/provider-requests/${encodeURIComponent(requestId)}/respond`,
    {
      method: 'PATCH',
      headers: await getStoredAuthorizationHeader(),
      body: JSON.stringify({ action }),
    },
  );
}

export async function updateProviderRequestStatus(requestId, status) {
  return apiRequest(
    `/api/provider-requests/${encodeURIComponent(requestId)}/status`,
    {
      method: 'PATCH',
      headers: await getStoredAuthorizationHeader(),
      body: JSON.stringify({ status }),
    },
  );
}

export async function createRequestRating(requestId, ratingData) {
  return apiRequest(
    `/api/requests/${encodeURIComponent(requestId)}/rating`,
    {
      method: 'POST',
      headers: await getStoredAuthorizationHeader(),
      body: JSON.stringify(ratingData),
    },
  );
}

export async function getProviderRatings() {
  return apiRequest('/api/providers/me/ratings', {
    method: 'GET',
    headers: await getStoredAuthorizationHeader(),
  });
}

export async function hideCustomerRequest(requestId) {
  return apiRequest(`/api/requests/${encodeURIComponent(requestId)}/hide`, {
    method: 'PATCH',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify({}),
  });
}

export async function hideProviderRequest(requestId) {
  return apiRequest(
    `/api/provider-requests/${encodeURIComponent(requestId)}/hide`,
    {
      method: 'PATCH',
      headers: await getStoredAuthorizationHeader(),
      body: JSON.stringify({}),
    },
  );
}

export async function getRequestTracking(requestId) {
  return apiRequest(`/api/tracking/${encodeURIComponent(requestId)}`, {
    method: 'GET',
    headers: await getStoredAuthorizationHeader(),
  });
}

export async function registerDevicePushToken(pushToken) {
  return apiRequest('/api/auth/push-token', {
    method: 'PUT',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify({ token: pushToken }),
  });
}

export async function unregisterDevicePushToken(pushToken) {
  return apiRequest('/api/auth/push-token', {
    method: 'DELETE',
    headers: await getStoredAuthorizationHeader(),
    body: JSON.stringify({ token: pushToken }),
  });
}