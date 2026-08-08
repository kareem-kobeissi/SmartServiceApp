import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const labels = {
  connected: 'Real-time connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

export default function RealtimeStatusIndicator() {
  const { isAuthenticated, realtimeStatus, user } = useAuth();

  if (!__DEV__ || !isAuthenticated || user?.role === 'provider') return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.indicator, styles[realtimeStatus]]}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>{labels[realtimeStatus]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    zIndex: 1000,
    ...shadows.small,
  },
  connected: { backgroundColor: colors.success },
  reconnecting: { backgroundColor: '#b45309' },
  offline: { backgroundColor: colors.mutedText },
  dot: { backgroundColor: colors.white, borderRadius: radius.pill, height: 7, width: 7 },
  text: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});
