import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { SERVICE_TYPE_OPTIONS } from '../constants/serviceTypes';
import { colors, radius, shadows, spacing } from '../constants/theme';
import useFocusPolling from '../hooks/useFocusPolling';
import { getProviderRatings } from '../services/api';

const serviceLabels = Object.fromEntries(SERVICE_TYPE_OPTIONS.map((service) => [service.value, service.label]));

export default function ProviderReviewsScreen({ navigation }) {
  const fetchReviews = useCallback(async () => getProviderRatings(), []);
  const { connectionMessage, data, initialError, isInitialLoading } = useFocusPolling(
    fetchReviews,
    { averageRating: 0, ratingCount: 0, ratings: [] },
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Reviews</Text>
        {!isInitialLoading ? (
          <View style={styles.summaryCard}>
            <Text style={styles.averageRating}>{data.ratingCount ? data.averageRating.toFixed(1) : 'New'}</Text>
            <Text style={styles.summaryText}>{data.ratingCount} {data.ratingCount === 1 ? 'rating' : 'ratings'}</Text>
          </View>
        ) : null}
        {connectionMessage ? <Text accessibilityRole="alert" style={styles.connectionMessage}>{connectionMessage}</Text> : null}
        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.helperText}>Loading reviews...</Text>
          </View>
        ) : initialError && data.ratings.length === 0 ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>{initialError}</Text>
        ) : data.ratings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.helperText}>Customer reviews will appear here after completed services.</Text>
          </View>
        ) : (
          <View style={styles.reviews}>
            {data.ratings.map((rating) => (
              <View key={rating.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.customerName}>{rating.customerName}</Text>
                  <Text style={styles.score}>{'\u2605'.repeat(rating.score)}</Text>
                </View>
                <Text style={styles.serviceType}>{serviceLabels[rating.serviceType] || rating.serviceType}</Text>
                <Text style={rating.comment ? styles.comment : styles.helperText}>{rating.comment || 'No written comment.'}</Text>
                <Text style={styles.date}>{new Date(rating.createdAt).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
        <AppButton label="Back to Provider Home" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { alignSelf: 'center', flexGrow: 1, gap: spacing.large, maxWidth: 820, padding: spacing.large, width: '100%' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  summaryCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, padding: spacing.large, ...shadows.small },
  averageRating: { color: colors.warning, fontSize: 30, fontWeight: '800' },
  summaryText: { color: colors.mutedText, fontSize: 14 },
  loadingContainer: { alignItems: 'center', gap: spacing.medium },
  helperText: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, gap: spacing.small, padding: spacing.extraLarge, ...shadows.small },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  reviews: { gap: spacing.medium },
  reviewCard: { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, gap: spacing.small, padding: spacing.large, ...shadows.small },
  reviewHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  customerName: { color: colors.text, flex: 1, flexShrink: 1, fontSize: 17, fontWeight: '800' },
  score: { color: colors.warning, fontSize: 17, fontWeight: '800' },
  serviceType: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  comment: { color: colors.text, fontSize: 15, lineHeight: 22 },
  date: { color: colors.mutedText, fontSize: 13 },
  connectionMessage: { color: colors.warning, textAlign: 'center' },
  errorMessage: { backgroundColor: colors.errorSoft, borderRadius: radius.medium, color: colors.error, padding: 12, textAlign: 'center' },
});
