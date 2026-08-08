import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentUser,
  loginUser,
  registerDevicePushToken,
  unregisterDevicePushToken,
} from '../services/api';
import {
  deleteAuthToken,
  getAuthToken,
  saveAuthToken,
} from '../services/tokenStorage';
import {
  connectRealtime,
  disconnectRealtime,
  subscribeRealtimeAuthenticationFailure,
  subscribeRealtimeStatus,
  stopAllProviderLocationSharing,
} from '../services/realtime';
import {
  clearRegisteredPushToken,
  getRegisteredPushToken,
  registerForPushNotifications,
} from '../services/pushNotifications';

const AuthContext = createContext(null);
const supportedRoles = ['customer', 'provider'];

function isSupportedUser(user) {
  return Boolean(user && supportedRoles.includes(user.role));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [restorationError, setRestorationError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('offline');

  const restoreSession = useCallback(async () => {
    setIsInitializing(true);
    setRestorationError('');

    let storedToken;

    try {
      storedToken = await getAuthToken();
    } catch {
      setUser(null);
      setToken(null);
      setRestorationError(
        'Unable to access the saved session. Please try again.',
      );
      setIsInitializing(false);
      return;
    }

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsInitializing(false);
      return;
    }

    setToken(storedToken);

    try {
      const result = await getCurrentUser(storedToken);

      if (!isSupportedUser(result.user)) {
        await deleteAuthToken();
        setUser(null);
        setToken(null);
      } else {
        setUser(result.user);
      }
    } catch (error) {
      if (error.status === 401) {
        await deleteAuthToken();
        setUser(null);
        setToken(null);
      } else {
        setUser(null);
        setRestorationError(
          'Unable to connect to Smart Service. Check your connection and retry.',
        );
      }
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const unsubscribeStatus = subscribeRealtimeStatus(setRealtimeStatus);
    const unsubscribeAuthenticationFailure =
      subscribeRealtimeAuthenticationFailure(async () => {
        await deleteAuthToken();
        setToken(null);
        setUser(null);
        setRestorationError('');
      });

    return () => {
      unsubscribeStatus();
      unsubscribeAuthenticationFailure();
    };
  }, []);

  useEffect(() => {
    if (token && user) {
      connectRealtime(token);
    } else {
      disconnectRealtime();
    }

    return () => disconnectRealtime();
  }, [token, user]);
  useEffect(() => {
    let cancelled = false;

    if (token && user) {
      registerForPushNotifications()
        .then(async (pushToken) => {
          if (!cancelled && pushToken) {
            await registerDevicePushToken(pushToken);
          }
        })
        .catch(() => {
          // Denied permission or push-service errors never block authentication.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const signIn = useCallback(async (credentials) => {
    const loginResult = await loginUser(credentials);
    await saveAuthToken(loginResult.token);

    try {
      const currentUserResult = await getCurrentUser(loginResult.token);

      if (!isSupportedUser(currentUserResult.user)) {
        throw new Error('This account has an unsupported role.');
      }

      setToken(loginResult.token);
      setUser(currentUserResult.user);
      setRestorationError('');

      return currentUserResult.user;
    } catch (error) {
      await deleteAuthToken();
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const pushToken = getRegisteredPushToken();
    if (pushToken) {
      try {
        await unregisterDevicePushToken(pushToken);
      } catch {
        // Logout remains available if push-token cleanup cannot reach the API.
      }
    }
    clearRegisteredPushToken();
    if (user?.role === 'provider') {
      try {
        await stopAllProviderLocationSharing();
      } catch {
        // Logout still completes if the backend is temporarily unavailable.
      }
    }
    disconnectRealtime();
    await deleteAuthToken();
    setToken(null);
    setUser(null);
    setRestorationError('');
  }, [user]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isInitializing,
      logout,
      restorationError,
      realtimeStatus,
      retrySession: restoreSession,
      signIn,
      user,
    }),
    [
      isInitializing,
      logout,
      restorationError,
      realtimeStatus,
      restoreSession,
      signIn,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
