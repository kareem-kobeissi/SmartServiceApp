import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { colors, radius, shadows, spacing } from '../constants/theme';

export default function SessionErrorScreen({ message, onRetry }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
          <Text accessibilityRole="alert" style={styles.title}>Connection problem</Text>
          <Text style={styles.message}>{message}</Text>
          <AppButton label="Retry connection" onPress={onRetry} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: spacing.large },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.extraLarge, borderWidth: 1, gap: spacing.large, maxWidth: 460, padding: spacing.extraLarge, width: '100%', ...shadows.card },
  icon: { alignItems: 'center', backgroundColor: colors.errorSoft, borderRadius: radius.pill, height: 54, justifyContent: 'center', width: 54 },
  iconText: { color: colors.error, fontSize: 24, fontWeight: '800' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.mutedText, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});