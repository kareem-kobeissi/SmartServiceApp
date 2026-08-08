import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '../constants/theme';

export function BrandLockup({ compact = false }) {
  return (
    <View style={[styles.brand, compact && styles.compactBrand]}>
      <View style={[styles.brandMark, compact && styles.compactBrandMark]}>
        <Text style={[styles.brandInitials, compact && styles.compactInitials]}>
          SS
        </Text>
      </View>
      <View>
        <Text style={styles.brandName}>Smart Service</Text>
        <Text style={styles.brandTagline}>Trusted help, close to home</Text>
      </View>
    </View>
  );
}

export function AuthCard({ children }) {
  return <View style={styles.card}>{children}</View>;
}

export default function AuthLayout({ children, contentStyle }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  decorations: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  topGlow: {
    backgroundColor: colors.primarySoft,
    borderRadius: 180,
    height: 300,
    position: 'absolute',
    right: -110,
    top: -125,
    width: 300,
  },
  bottomGlow: {
    backgroundColor: colors.accentSoft,
    borderRadius: 150,
    bottom: -145,
    height: 280,
    left: -115,
    position: 'absolute',
    width: 280,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.extraLarge,
  },
  content: { alignSelf: 'center', maxWidth: 520, width: '100%' },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.medium,
    justifyContent: 'center',
  },
  compactBrand: { justifyContent: 'flex-start' },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.large,
    height: 60,
    justifyContent: 'center',
    width: 60,
    ...shadows.small,
  },
  compactBrandMark: { borderRadius: radius.medium, height: 48, width: 48 },
  brandInitials: { color: colors.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  compactInitials: { fontSize: 16 },
  brandName: { color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  brandTagline: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radius.extraLarge,
    borderWidth: 1,
    padding: spacing.large,
    ...shadows.card,
  },
});
