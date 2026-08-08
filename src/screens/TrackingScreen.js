import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import RequestStatusBadge from '../components/RequestStatusBadge';
import TrackingMap from '../components/TrackingMap';
import { colors, radius, shadows, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import useRequestRooms from '../hooks/useRequestRooms';
import { getRequestTracking } from '../services/api';
import {
  sendProviderLocationUpdate,
  startProviderLocationSharing,
  stopProviderLocationSharing,
  subscribeRealtimeEvents,
} from '../services/realtime';
import { calculateApproximateEtaMinutes, calculateDistanceKm } from '../utils/location';

const ACTIVE_STATUSES = ['accepted', 'on_the_way', 'arrived', 'in_progress'];
const LOCATION_STALE_MS = 30000;

export function isProviderLocationFresh(tracking, now = Date.now()) {
  if (!tracking?.locationSharingActive || !tracking.providerLocationUpdatedAt) return false;
  const updatedAt = new Date(tracking.providerLocationUpdatedAt).getTime();
  return Number.isFinite(updatedAt) && now - updatedAt <= LOCATION_STALE_MS;
}

export default function TrackingScreen({ navigation, route }) {
  const requestId = String(route.params?.requestId || '');
  const { realtimeStatus, user } = useAuth();
  const isProvider = user.role === 'provider';
  const subscriptionRef = useRef(null);
  const sharingRef = useRef(false);
  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isChangingSharing, setIsChangingSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [clock, setClock] = useState(Date.now());
  useRequestRooms(requestId ? [requestId] : []);

  const stopLocalWatch = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    sharingRef.current = false;
    setIsSharing(false);
  }, []);

  const applyStoppedState = useCallback((timestamp = new Date().toISOString()) => {
    setTracking((current) => current && ({
      ...current,
      locationSharingActive: false,
      locationSharingStoppedAt: timestamp,
      providerLocation: null,
      providerLocationUpdatedAt: null,
    }));
  }, []);

  const loadTracking = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    try {
      const result = await getRequestTracking(requestId);
      setTracking(result.tracking);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load live tracking.');
    } finally {
      if (!background) setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadTracking();
    return () => {
      const shouldNotify = isProvider && sharingRef.current;
      stopLocalWatch();
      if (shouldNotify) stopProviderLocationSharing(requestId).catch(() => {});
    };
  }, [isProvider, loadTracking, requestId, stopLocalWatch]);

  useEffect(() => {
    if (realtimeStatus === 'connected') loadTracking(true);
    else if (isProvider) stopLocalWatch();
  }, [isProvider, loadTracking, realtimeStatus, stopLocalWatch]);

  useEffect(() => {
    const interval = setInterval(
      () => loadTracking(true),
      realtimeStatus === 'connected' ? 30000 : 5000,
    );
    return () => clearInterval(interval);
  }, [loadTracking, realtimeStatus]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => subscribeRealtimeEvents((eventName, payload) => {
    if (String(payload?.requestId) !== requestId) return;
    if (eventName === 'provider:locationSharingStarted') {
      setTracking((current) => current && ({
        ...current,
        locationSharingActive: true,
        locationSharingStartedAt: payload.timestamp,
        locationSharingStoppedAt: null,
        providerLocation: null,
        providerLocationUpdatedAt: null,
      }));
      return;
    }
    if (eventName === 'provider:locationSharingStopped') {
      stopLocalWatch();
      applyStoppedState(payload.timestamp);
      return;
    }
    if (eventName === 'provider:locationUpdated') {
      setTracking((current) => current && ({
        ...current,
        locationSharingActive: true,
        providerLocation: { latitude: payload.latitude, longitude: payload.longitude },
        providerLocationUpdatedAt: payload.timestamp,
        status: payload.status || current.status,
      }));
      return;
    }
    if (eventName.startsWith('request:')) {
      if (payload.status) {
        setTracking((current) => current && ({ ...current, status: payload.status }));
        if (!ACTIVE_STATUSES.includes(payload.status)) {
          stopLocalWatch();
          applyStoppedState(payload.timestamp);
        }
      }
      loadTracking(true);
    }
  }), [applyStoppedState, loadTracking, requestId, stopLocalWatch]);

  async function transmitLocation(location) {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      stopLocalWatch();
      try {
        await stopProviderLocationSharing(requestId);
      } catch {}
      throw new Error('Location permission is no longer available.');
    }
    const update = await sendProviderLocationUpdate({
      requestId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp || Date.now()).toISOString(),
    });
    setTracking((current) => current && ({
      ...current,
      locationSharingActive: true,
      providerLocation: { latitude: update.latitude, longitude: update.longitude },
      providerLocationUpdatedAt: update.timestamp,
    }));
  }

  async function startSharing() {
    setErrorMessage('');
    setIsChangingSharing(true);
    if (realtimeStatus !== 'connected') {
      setErrorMessage('Real-time connection is offline. Wait for reconnection and try again.');
      setIsChangingSharing(false);
      return;
    }
    let backendStarted = false;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Foreground location permission was denied.');
      if (!await Location.hasServicesEnabledAsync()) throw new Error('Location services are disabled.');
      stopLocalWatch();
      const started = await startProviderLocationSharing(requestId);
      backendStarted = true;
      setTracking((current) => current && ({
        ...current,
        locationSharingActive: true,
        locationSharingStartedAt: started.timestamp,
        locationSharingStoppedAt: null,
        providerLocation: null,
        providerLocationUpdatedAt: null,
      }));
      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (location) => transmitLocation(location).catch((error) => setErrorMessage(error.message)),
      );
      sharingRef.current = true;
      setIsSharing(true);
    } catch (error) {
      stopLocalWatch();
      if (backendStarted) {
        try {
          await stopProviderLocationSharing(requestId);
        } catch {}
      }
      setErrorMessage(error.message || 'Unable to start location sharing.');
    } finally {
      setIsChangingSharing(false);
    }
  }

  async function stopSharing() {
    setErrorMessage('');
    setIsChangingSharing(true);
    stopLocalWatch();
    try {
      const stopped = await stopProviderLocationSharing(requestId);
      applyStoppedState(stopped.timestamp);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to stop location sharing.');
    } finally {
      setIsChangingSharing(false);
    }
  }

  const locationIsFresh = isProviderLocationFresh(tracking, clock);
  const showMap = Boolean(tracking?.locationSharingActive && tracking.providerLocation && locationIsFresh);
  const distanceKm = showMap
    ? calculateDistanceKm(tracking.customerLocation, tracking.providerLocation)
    : null;
  const etaMinutes = calculateApproximateEtaMinutes(distanceKm);
  const sharingJustStarted = tracking?.locationSharingActive && tracking.locationSharingStartedAt &&
    clock - new Date(tracking.locationSharingStartedAt).getTime() <= LOCATION_STALE_MS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Live Service Tracking</Text>
        <Text style={styles.subtitle}>Follow the provider location while sharing is active.</Text>
        {isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        {tracking ? (
          <>
            <RequestStatusBadge
              label={tracking.status.replaceAll('_', ' ')}
              status={tracking.status}
            />
            {showMap ? (
              <View style={styles.mapCard}>
                <TrackingMap
                  customerLocation={tracking.customerLocation}
                  providerLocation={tracking.providerLocation}
                />
                <View style={styles.trackingDetails}>
                  <Text style={styles.detail}>Last provider update: {new Date(tracking.providerLocationUpdatedAt).toLocaleString()}</Text>
                  <Text style={styles.detail}>Straight-line distance: {distanceKm.toFixed(2)} km</Text>
                  <Text style={styles.detail}>Approximate arrival: {etaMinutes} minutes</Text>
                  <Text style={styles.helper}>Estimate uses straight-line distance and 30 km/h, not traffic or road routing.</Text>
                </View>
              </View>
            ) : !tracking.locationSharingActive ? (
              <Text style={styles.notice}>The provider stopped sharing their location.</Text>
            ) : sharingJustStarted ? (
              <Text style={styles.notice}>Waiting for the provider's first location update.</Text>
            ) : (
              <Text style={styles.notice}>Provider location is temporarily unavailable.</Text>
            )}
            {isProvider ? (
              <View style={styles.controls}>
                <Text style={isSharing ? styles.sharing : styles.helper}>
                  {isSharing ? 'Location sharing is active on this device' :
                    tracking.locationSharingActive ? 'Restart sharing on this device to continue updates' : 'Location sharing is stopped'}
                </Text>
                <AppButton
                  label={isChangingSharing ? 'Updating...' : 'Start Sharing Location'}
                  disabled={isSharing || isChangingSharing}
                  onPress={startSharing}
                />
                {isSharing || tracking.locationSharingActive ? (
                  <AppButton
                    label={isChangingSharing ? 'Stopping...' : 'Stop Sharing Location'}
                    disabled={isChangingSharing}
                    variant="secondary"
                    onPress={stopSharing}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
        {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}
        <AppButton label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { alignSelf: 'center', flexGrow: 1, gap: spacing.large, maxWidth: 900, padding: spacing.large, width: '100%' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.mutedText, fontSize: 15, lineHeight: 23 },
  status: { color: colors.primary, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  mapCard: { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, overflow: 'hidden', ...shadows.small },
  trackingDetails: { gap: spacing.small, padding: spacing.large },
  detail: { color: colors.text, fontSize: 14, lineHeight: 21 },
  controls: { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, gap: spacing.small, padding: spacing.large, ...shadows.small },
  helper: { color: colors.mutedText, fontSize: 13, lineHeight: 19 },
  notice: { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, color: colors.mutedText, padding: spacing.medium, textAlign: 'center' },
  sharing: { color: colors.success, fontWeight: '700' },
  error: { backgroundColor: colors.errorSoft, borderRadius: radius.medium, color: colors.error, padding: 12, textAlign: 'center' },
});