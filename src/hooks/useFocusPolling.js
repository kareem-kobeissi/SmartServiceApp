import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { subscribeRealtimeEvents } from '../services/realtime';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const CONNECTED_FALLBACK_INTERVAL_MS = 30000;

export default function useFocusPolling(
  fetchData,
  initialData,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  const { realtimeStatus } = useAuth();
  const [data, setData] = useState(initialData);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const hasLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let isFetching = false;
      let refreshQueued = false;

      async function refresh() {
        if (isFetching) {
          refreshQueued = true;
          return;
        }

        isFetching = true;
        refreshQueued = false;

        try {
          const nextData = await fetchData();
          if (!isActive) return;
          setData(nextData);
          setInitialError('');
          setConnectionMessage('');
          hasLoadedRef.current = true;
        } catch (error) {
          if (!isActive) return;
          const message = error.message || 'Unable to connect. Retrying automatically.';
          if (hasLoadedRef.current) {
            setConnectionMessage(`${message} Retrying automatically.`);
          } else {
            setInitialError(message);
          }
        } finally {
          isFetching = false;
          if (isActive) setIsInitialLoading(false);
          if (isActive && refreshQueued) refresh();
        }
      }

      if (!hasLoadedRef.current) setIsInitialLoading(true);
      refresh();

      const unsubscribeRealtime = subscribeRealtimeEvents(refresh);
      const fallbackInterval =
        realtimeStatus === 'connected'
          ? Math.max(intervalMs, CONNECTED_FALLBACK_INTERVAL_MS)
          : intervalMs;
      const intervalId = setInterval(refresh, fallbackInterval);

      return () => {
        isActive = false;
        clearInterval(intervalId);
        unsubscribeRealtime();
      };
    }, [fetchData, intervalMs, realtimeStatus]),
  );

  return {
    connectionMessage,
    data,
    initialError,
    isInitialLoading,
    setData,
  };
}