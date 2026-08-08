import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) {
    return '';
  }

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  return remainingMinutes
    ? `${hourLabel} ${remainingMinutes} minutes`
    : hourLabel;
}

export default function ServiceEstimate({ request }) {
  const hasEstimate =
    Number.isFinite(request.estimatedMinPrice) &&
    Number.isFinite(request.estimatedMaxPrice) &&
    Number.isFinite(request.estimatedDurationMinutes);

  if (!hasEstimate) {
    return (
      <View style={styles.container}>
        <Text style={styles.unavailable}>Estimate unavailable.</Text>
      </View>
    );
  }

  const currencySymbol =
    request.estimationCurrency === 'USD'
      ? '$'
      : `${request.estimationCurrency || 'USD'} `;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Initial service estimate</Text>
      <Text style={styles.value}>
        Estimated price: {currencySymbol}{request.estimatedMinPrice}
        {'\u2013'}{currencySymbol}{request.estimatedMaxPrice}
      </Text>
      <Text style={styles.value}>
        Estimated duration: {formatDuration(request.estimatedDurationMinutes)}
      </Text>
      <Text style={styles.reason}>{request.estimationReason}</Text>
      <Text style={styles.warning}>
        Initial estimate only. Final price is confirmed by the provider after inspection.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, gap: 6, padding: spacing.medium },
  title: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 14, fontWeight: '700' },
  reason: { color: colors.mutedText, fontSize: 13, lineHeight: 19 },
  warning: { color: colors.warning, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  unavailable: { color: colors.mutedText, fontSize: 13, fontStyle: 'italic' },
});
export { formatDuration };
