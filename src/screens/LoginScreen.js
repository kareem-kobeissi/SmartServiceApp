import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import AuthLayout, { AuthCard, BrandLockup } from '../components/AuthLayout';
import FormInput from '../components/FormInput';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage('');
    if (!normalizedEmail || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn({ email: normalizedEmail, password });
      setEmail('');
      setPassword('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <BrandLockup compact />
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text style={styles.title}>Log in to your account</Text>
        <Text style={styles.subtitle}>Continue managing your services and requests.</Text>
      </View>

      <AuthCard>
        <View style={styles.form}>
          <FormInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <FormInput
            autoCapitalize="none"
            autoComplete="password"
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
          />
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <AppButton disabled={isSubmitting} label={isSubmitting ? 'Logging In...' : 'Login'} onPress={handleLogin} />
            <AppButton disabled={isSubmitting} label="Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        </View>
      </AuthCard>

      <Text style={styles.securityText}>Your session is protected with secure authentication.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: spacing.large, marginTop: spacing.huge },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 39, marginTop: spacing.small },
  subtitle: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: spacing.small },
  form: { gap: spacing.medium },
  actions: { gap: 12, marginTop: spacing.small },
  errorBox: { backgroundColor: colors.errorSoft, borderColor: '#fecdca', borderRadius: radius.medium, borderWidth: 1, padding: 12 },
  errorMessage: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  securityText: { color: colors.subtleText, fontSize: 12, marginTop: spacing.large, textAlign: 'center' },
});