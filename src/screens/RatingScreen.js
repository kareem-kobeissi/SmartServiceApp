import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { colors, radius, shadows, spacing } from '../constants/theme';
import { createRequestRating } from '../services/api';

export default function RatingScreen({ navigation, route }) {
  const { providerName, requestId } = route.params;
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit() {
    setErrorMessage('');
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      setErrorMessage('Select a rating from 1 to 5 stars.');
      return;
    }
    if (comment.length > 500) {
      setErrorMessage('Comment must contain no more than 500 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRequestRating(requestId, {
        score,
        comment: comment.trim(),
      });
      navigation.navigate('MyRequests', { notice: result.message });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save your rating.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
      <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Rate Provider</Text>
        <Text style={styles.helperText}>How was your service with {providerName}?</Text>
        <View accessibilityRole="radiogroup" style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: score === value }}
              disabled={isSubmitting}
              key={value}
              onPress={() => { setScore(value); setErrorMessage(''); }}
              style={styles.starButton}
            >
              <Text style={[styles.star, value <= score && styles.selectedStar]}>{'\u2605'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.selectedScore}>{score ? `${score} out of 5` : 'Select a score'}</Text>
        <TextInput
          editable={!isSubmitting}
          maxLength={500}
          multiline
          onChangeText={setComment}
          placeholder="Share an optional comment about the service"
          placeholderTextColor={colors.subtleText}
          selectionColor={colors.primary}
          style={styles.commentInput}
          textAlignVertical="top"
          value={comment}
        />
        <Text style={styles.characterCount}>{comment.length}/500</Text>
        {errorMessage ? <Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text> : null}
        <AppButton disabled={isSubmitting} label={isSubmitting ? 'Submitting...' : 'Submit Rating'} onPress={handleSubmit} />
        <AppButton disabled={isSubmitting} label="Back" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { alignSelf: 'center', flexGrow: 1, gap: spacing.large, justifyContent: 'center', maxWidth: 640, padding: spacing.large, width: '100%' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  helperText: { color: colors.mutedText, fontSize: 16, lineHeight: 22 },
  stars: { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.large, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: spacing.small, ...shadows.small },
  starButton: { minHeight: 48, minWidth: 48, padding: 4 },
  star: { color: colors.border, fontSize: 42 },
  selectedStar: { color: colors.warning },
  selectedScore: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  commentInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.large, borderWidth: 1, color: colors.text, minHeight: 130, padding: spacing.medium },
  characterCount: { color: colors.mutedText, textAlign: 'right' },
  errorMessage: { backgroundColor: colors.errorSoft, borderRadius: radius.medium, color: colors.error, padding: 12, textAlign: 'center' },
});
