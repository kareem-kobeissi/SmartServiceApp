import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../constants/theme';

const palettes = {
  pending: { backgroundColor: colors.primarySoft, color: colors.primary },
  offered: { backgroundColor: colors.warningSoft, color: colors.warning },
  accepted: { backgroundColor: colors.accentSoft, color: colors.accent },
  on_the_way: { backgroundColor: colors.purpleSoft, color: colors.purple },
  arrived: { backgroundColor: colors.purpleSoft, color: colors.purple },
  in_progress: { backgroundColor: colors.orangeSoft, color: colors.orange },
  completed: { backgroundColor: colors.successSoft, color: colors.success },
  rejected: { backgroundColor: colors.errorSoft, color: colors.error },
  cancelled: { backgroundColor: colors.surfaceMuted, color: colors.mutedText },
};

export default function RequestStatusBadge({ label, status }) {
  const palette = palettes[status] || palettes.pending;

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexShrink: 1,
    maxWidth: '58%',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
