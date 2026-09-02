import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { SERVICE_TYPE_OPTIONS } from '../constants/serviceTypes';
import { colors, radius, shadows, spacing } from '../constants/theme';
import useFocusPolling from '../hooks/useFocusPolling';
import useRequestRooms from '../hooks/useRequestRooms';
import {
  getAvailableProviders,
  selectRequestProvider,
} from '../services/api';

const serviceLabels = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((service) => [service.value, service.label]),
);

export default function AvailableProvidersScreen({ navigation, route }) {
  useRequestRooms([route.params.requestId]);
  const [selectingProviderId, setSelectingProviderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProviders = useCallback(async () => {
    const result = await getAvailableProviders(route.params.requestId);
    return {
      etaNotice: result.etaNotice,
      providers: result.providers,
    };
  }, [route.params.requestId]);
  const {
    connectionMessage,
    data,
    initialError,
    isInitialLoading,
  } = useFocusPolling(fetchProviders, {
    etaNotice: '',
    providers: [],
  });
  const { etaNotice, providers } = data;

  const matchingService =
    serviceLabels[route.params.serviceType] || route.params.serviceType;

  async function confirmProviderSelection(provider) {
    setErrorMessage('');
    setSelectingProviderId(provider.id);

    try {
      await selectRequestProvider(route.params.requestId, provider.id);
      navigation.navigate('MyRequests', {
        notice: `${provider.fullName} was selected. Waiting for provider response.`,
      });
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to select this provider.',
      );
      setSelectingProviderId(null);
    }
  }

  function handleSelectProvider(provider) {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm(
        `Send this service request to ${provider.fullName}?`,
      );

      if (confirmed) {
        confirmProviderSelection(provider);
      }
      return;
    }

    Alert.alert(
      'Select provider',
      `Send this service request to ${provider.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: () => confirmProviderSelection(provider),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Available Providers</Text>
        <Text style={styles.subtitle}>
          Nearby providers for {matchingService}
        </Text>
        <Text style={styles.rankingNotice}>
          Providers are ordered by nearest distance first. When distance is
          equal, the provider with the higher rating appears first.
        </Text>

        {etaNotice ? (
          <Text style={styles.etaNotice}>{etaNotice}</Text>
        ) : null}
        {connectionMessage ? (
          <Text accessibilityRole="alert" style={styles.connectionMessage}>
            {connectionMessage}
          </Text>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.helperText}>
              Finding nearby providers...
            </Text>
          </View>
        ) : initialError && providers.length === 0 ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {initialError}
          </Text>
        ) : providers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No available providers nearby
            </Text>
            <Text style={styles.helperText}>
              We will check again automatically. You can also return and try later.
            </Text>
          </View>
        ) : (
          <View style={styles.providers}>
            {providers.map((provider) => (
              <View key={provider.id} style={styles.providerCard}>
                <Text style={styles.providerName}>
                  {provider.fullName}
                </Text>
                <Text style={styles.detail}>
                  Matching service: {matchingService}
                </Text>
                <Text style={styles.detail}>
                  Rating:{' '}
                  {provider.averageRating > 0
                    ? provider.averageRating.toFixed(1)
                    : 'New provider'}
                </Text>
                <Text style={styles.distance}>
                  {provider.distanceKm.toFixed(2)} km away
                </Text>
                <Text style={styles.arrival}>
                  Approximate arrival: {provider.approximateArrivalMinutes}{' '}
                  minutes
                </Text>
                <AppButton
                  disabled={Boolean(selectingProviderId)}
                  label={
                    selectingProviderId === provider.id
                      ? 'Selecting...'
                      : 'Select Provider'
                  }
                  onPress={() => handleSelectProvider(provider)}
                />
              </View>
            ))}
          </View>
        )}

        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {errorMessage}
          </Text>
        ) : null}
        <AppButton
          disabled={Boolean(selectingProviderId)}
          label="Back to My Requests"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    gap: spacing.large,
    alignSelf: 'center',
    maxWidth: 820,
    padding: spacing.large,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 16,
  },
  etaNotice: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.medium,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.medium,
  },
  rankingNotice: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: spacing.medium,
    paddingVertical: spacing.extraLarge,
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radius.large,
    borderWidth: 1,
    gap: spacing.small,
    padding: spacing.extraLarge,
    ...shadows.small,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  providers: {
    gap: spacing.medium,
  },
  providerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radius.large,
    borderWidth: 1,
    gap: spacing.small,
    padding: spacing.large,
    ...shadows.small,
  },
  providerName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  detail: {
    color: colors.text,
    fontSize: 14,
  },
  distance: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  arrival: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
  errorMessage: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.medium,
    color: colors.error,
    padding: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  connectionMessage: {
    color: colors.warning,
    fontSize: 13,
    textAlign: 'center',
  },
});
