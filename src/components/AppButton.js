import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, shadows, spacing } from '../constants/theme';

export default function AppButton({
  disabled = false,
  label,
  onPress,
  variant = 'primary',
}) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isSecondary ? styles.secondaryButton : styles.primaryButton,
        pressed && !disabled && (isSecondary ? styles.secondaryPressed : styles.primaryPressed),
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, isSecondary ? styles.secondaryLabel : styles.primaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.large,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.small,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  primaryPressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  secondaryPressed: { backgroundColor: colors.surfaceMuted, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.text },
});