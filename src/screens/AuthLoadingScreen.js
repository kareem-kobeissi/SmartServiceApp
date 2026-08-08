import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '../constants/theme';

export default function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.logo}><Text style={styles.logoText}>SS</Text></View>
          <Text style={styles.brand}>Smart Service</Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.message}>Checking your secure session...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: spacing.large },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.extraLarge, borderWidth: 1, gap: spacing.medium, maxWidth: 420, padding: spacing.extraLarge, width: '100%', ...shadows.card },
  logo: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.large, height: 58, justifyContent: 'center', width: 58 },
  logoText: { color: colors.white, fontSize: 20, fontWeight: '800' },
  brand: { color: colors.text, fontSize: 23, fontWeight: '800' },
  message: { color: colors.mutedText, fontSize: 16, textAlign: 'center' },
});