import { StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import AuthLayout, { AuthCard, BrandLockup } from '../components/AuthLayout';
import { colors, radius, spacing } from '../constants/theme';

const benefits = [
  { number: '01', title: 'Trusted providers', text: 'Find skilled professionals for everyday service needs.' },
  { number: '02', title: 'Location aware', text: 'Connect with available providers around your area.' },
  { number: '03', title: 'Track progress', text: 'Follow every request from acceptance to completion.' },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <AuthLayout>
      <BrandLockup />

      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>SERVICES MADE SIMPLE</Text>
        </View>
        <Text style={styles.title}>The right help, right when you need it.</Text>
        <Text style={styles.subtitle}>Find trusted service providers near you and manage the entire service experience in one place.</Text>
      </View>

      <View style={styles.benefits}>
        {benefits.map((benefit) => (
          <View key={benefit.number} style={styles.benefitRow}>
            <View style={styles.benefitNumber}><Text style={styles.benefitNumberText}>{benefit.number}</Text></View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <AuthCard>
        <View style={styles.actions}>
          <AppButton label="Login" onPress={() => navigation.navigate('Login')} />
          <AppButton label="Create Account" onPress={() => navigation.navigate('Register')} variant="secondary" />
        </View>
        <Text style={styles.footerText}>Simple, secure and built for your community.</Text>
      </AuthCard>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.huge },
  eyebrow: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  eyebrowText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 38, fontWeight: '800', letterSpacing: -1.2, lineHeight: 45, marginTop: spacing.medium, maxWidth: 470, textAlign: 'center' },
  subtitle: { color: colors.mutedText, fontSize: 16, lineHeight: 25, marginTop: 14, maxWidth: 450, textAlign: 'center' },
  benefits: { gap: 14, marginVertical: spacing.extraLarge },
  benefitRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 14 },
  benefitNumber: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radius.medium, height: 42, justifyContent: 'center', width: 42 },
  benefitNumberText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  benefitText: { color: colors.mutedText, fontSize: 13, lineHeight: 19, marginTop: 2 },
  actions: { gap: 12 },
  footerText: { color: colors.subtleText, fontSize: 12, marginTop: spacing.medium, textAlign: 'center' },
});