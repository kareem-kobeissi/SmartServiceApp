import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text } from 'react-native';

import { colors } from '../constants/theme';
import AppButton from './AppButton';

export default function RequestCleanupButton({
  onRemoved,
  removeRequest,
  requestId,
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function submitRemoval() {
    if (isRemoving) {
      return;
    }

    setErrorMessage('');
    setIsRemoving(true);

    try {
      await removeRequest(requestId);
      onRemoved(requestId);
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to remove this request from your list.',
      );
    } finally {
      setIsRemoving(false);
    }
  }

  function confirmRemoval() {
    const message = 'Remove this request from your list?';

    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) {
        submitRemoval();
      }
      return;
    }

    Alert.alert('Remove request', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: submitRemoval },
    ]);
  }

  return (
    <>
      <AppButton
        disabled={isRemoving}
        label={isRemoving ? 'Removing...' : 'Delete from my list'}
        onPress={confirmRemoval}
        variant="secondary"
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.errorMessage}>
          {errorMessage}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  errorMessage: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
});
