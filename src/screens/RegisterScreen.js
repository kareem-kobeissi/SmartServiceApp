import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/AppButton';
import AuthLayout, { AuthCard, BrandLockup } from '../components/AuthLayout';
import FormInput from '../components/FormInput';
import { colors, radius, spacing } from '../constants/theme';
import { registerUser } from '../services/api';

const accountTypes = [
  { label: 'Customer', description: 'Request and manage services', role: 'customer' },
  { label: 'Service Provider', description: 'Offer services to customers', role: 'provider' },
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const trimmedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage('');
    setSuccessMessage('');
    if (!trimmedFullName || !normalizedEmail || !password || !role) {
      setErrorMessage('Please complete all fields and select an account type.');
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerUser({ fullName: trimmedFullName, email: normalizedEmail, password, role });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('customer');
      setSuccessMessage('Account created successfully. Opening login...');
      setTimeout(() => navigation.replace('Login'), 1200);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create the account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout contentStyle={styles.layoutContent}>
      <BrandLockup compact />
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>GET STARTED</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Choose how you will use Smart Service, then enter your details.</Text>
      </View>

      <AuthCard>
        <View style={styles.form}>
          <View style={styles.accountTypeGroup}>
            <Text style={styles.sectionLabel}>I want to join as</Text>
            <View style={styles.accountTypeOptions}>
              {accountTypes.map((accountType) => {
                const isSelected = role === accountType.role;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    disabled={isSubmitting}
                    key={accountType.role}
                    onPress={() => setRole(accountType.role)}
                    style={({ pressed }) => [
                      styles.accountTypeOption,
                      isSelected && styles.selectedAccountType,
                      pressed && styles.pressedAccountType,
                    ]}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.selectedRadioOuter]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <View style={styles.accountTypeCopy}>
                      <Text style={[styles.accountTypeText, isSelected && styles.selectedAccountTypeText]}>{accountType.label}</Text>
                      <Text style={styles.accountTypeDescription}>{accountType.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          <FormInput autoComplete="name" label="Full name" onChangeText={setFullName} placeholder="Enter your full name" value={fullName} />
          <FormInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="you@example.com" value={email} />
          <FormInput autoCapitalize="none" autoComplete="new-password" label="Password" onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry value={password} />

          {errorMessage ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text></View> : null}
          {successMessage ? <View style={styles.successBox}><Text accessibilityRole="alert" style={styles.successMessage}>{successMessage}</Text></View> : null}

          <View style={styles.actions}>
            <AppButton disabled={isSubmitting || Boolean(successMessage)} label={isSubmitting ? 'Creating Account...' : 'Create Account'} onPress={handleRegister} />
            <AppButton disabled={isSubmitting || Boolean(successMessage)} label="Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        </View>
      </AuthCard>
      <Text style={styles.termsText}>By continuing, you agree to use Smart Service responsibly.</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  layoutContent: { paddingVertical: spacing.large },
  heading: { marginBottom: spacing.large, marginTop: spacing.extraLarge },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 39, marginTop: spacing.small },
  subtitle: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: spacing.small },
  form: { gap: spacing.medium },
  accountTypeGroup: { gap: 10 },
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  accountTypeOptions: { gap: 10 },
  accountTypeOption: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight, borderRadius: radius.medium, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 68, padding: 13 },
  selectedAccountType: { backgroundColor: '#f5f9ff', borderColor: colors.primary },
  pressedAccountType: { opacity: 0.82 },
  radioOuter: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', width: 20 },
  selectedRadioOuter: { borderColor: colors.primary },
  radioInner: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
  accountTypeCopy: { flex: 1 },
  accountTypeText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  selectedAccountTypeText: { color: colors.primaryPressed },
  accountTypeDescription: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  divider: { backgroundColor: colors.borderLight, height: 1, marginVertical: spacing.tiny },
  actions: { gap: 12, marginTop: spacing.small },
  errorBox: { backgroundColor: colors.errorSoft, borderColor: '#fecdca', borderRadius: radius.medium, borderWidth: 1, padding: 12 },
  errorMessage: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  successBox: { backgroundColor: colors.successSoft, borderColor: '#abefc6', borderRadius: radius.medium, borderWidth: 1, padding: 12 },
  successMessage: { color: colors.success, fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  termsText: { color: colors.subtleText, fontSize: 12, marginTop: spacing.large, textAlign: 'center' },
});