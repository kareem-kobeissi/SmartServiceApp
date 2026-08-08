import { useState } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import { SERVICE_TYPE_OPTIONS } from '../constants/serviceTypes';
import { colors, radius, shadows, spacing } from '../constants/theme';
import { createServiceRequest } from '../services/api';

const LOCATION_TIMEOUT_MS = 15000;

export default function CreateRequestScreen({ navigation }) {
  const [serviceType, setServiceType] = useState(null);
  const [description, setDescription] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleUseCurrentLocation() {
    setErrorMessage('');
    setCustomerLocation(null);
    setIsLocating(true);

    try {
      if (
        Platform.OS === 'web' &&
        (typeof navigator === 'undefined' || !navigator.geolocation)
      ) {
        setErrorMessage(
          'Location is not supported by this browser. Use a browser with geolocation enabled.',
        );
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setErrorMessage(
          'Location permission was denied. Allow foreground location access to attach your position.',
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setErrorMessage(
          'Location services are disabled. Turn on GPS or Location Services and try again.',
        );
        return;
      }

      const timeout = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('LOCATION_TIMEOUT')),
          LOCATION_TIMEOUT_MS,
        );
      });
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        timeout,
      ]);
      const { latitude, longitude } = position.coords;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('LOCATION_UNAVAILABLE');
      }

      setCustomerLocation({ latitude, longitude });
    } catch (error) {
      if (error.message === 'LOCATION_TIMEOUT') {
        setErrorMessage(
          'Location timed out. Move to an open area and try again.',
        );
      } else {
        setErrorMessage(
          'Your current location is unavailable. Check location services and try again.',
        );
      }
    } finally {
      setIsLocating(false);
    }
  }
  async function handlePickImage() {
    setErrorMessage('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Photo-library permission is required to select an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        mediaTypes: ['images'],
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const fileName = (asset.fileName || asset.file?.name || '').toLowerCase();
      const inferredMimeType = fileName.endsWith('.png')
        ? 'image/png'
        : fileName.endsWith('.webp')
          ? 'image/webp'
          : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
            ? 'image/jpeg'
            : null;
      const mimeType = asset.mimeType || asset.file?.type || inferredMimeType;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        setErrorMessage('Select a JPEG, PNG, or WebP image.');
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage('The selected image must be 5 MB or smaller.');
        return;
      }

      setSelectedImage({ ...asset, mimeType });
    } catch {
      setErrorMessage('Unable to open the image library. Please try again.');
    }
  }

  async function handleSubmit() {
    const trimmedDescription = description.trim();

    setErrorMessage('');

    if (!serviceType) {
      setErrorMessage('Select a service category.');
      return;
    }

    if (trimmedDescription.length < 10) {
      setErrorMessage(
        'Describe the problem using at least 10 characters.',
      );
      return;
    }

    if (!customerLocation) {
      setErrorMessage('Capture your current location before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createServiceRequest({
        serviceType,
        description: trimmedDescription,
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      }, selectedImage);

      setServiceType(null);
      setDescription('');
      setCustomerLocation(null);
      setSelectedImage(null);
      navigation.replace('MyRequests', {
        notice: 'Service request created successfully.',
      });
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to create the service request.',
      );
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Request a Service</Text>
          <Text style={styles.subtitle}>
            Choose a category and describe the problem.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service category</Text>
            <View style={styles.options}>
              {SERVICE_TYPE_OPTIONS.map((service) => {
                const isSelected = serviceType === service.value;

                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    disabled={isSubmitting}
                    key={service.value}
                    onPress={() => {
                      setServiceType(service.value);
                      setErrorMessage('');
                    }}
                    style={[
                      styles.option,
                      isSelected && styles.selectedOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {service.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FormInput
            editable={!isSubmitting && !isLocating}
            inputStyle={styles.descriptionInput}
            label="Problem description"
            multiline
            numberOfLines={5}
            onChangeText={setDescription}
            placeholder="Describe what is wrong and where the issue is..."
            textAlignVertical="top"
            value={description}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional problem image</Text>
            {selectedImage ? (
              <View style={styles.imagePreviewCard}>
                <Image
                  accessibilityLabel="Selected service-request image"
                  resizeMode="cover"
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                />
                <AppButton
                  disabled={isSubmitting}
                  label="Remove Image"
                  onPress={() => setSelectedImage(null)}
                  variant="secondary"
                />
              </View>
            ) : (
              <AppButton
                disabled={isSubmitting}
                label="Select an Image"
                onPress={handlePickImage}
                variant="secondary"
              />
            )}
          </View>
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Service location</Text>
            <Text style={styles.sectionHint}>Required to find nearby providers.</Text>
            <AppButton
              disabled={isSubmitting || isLocating}
              label={
                isLocating
                  ? 'Finding Your Location...'
                  : 'Use My Current Location'
              }
              onPress={handleUseCurrentLocation}
              variant="secondary"
            />
            {customerLocation ? (
              <View style={styles.locationConfirmation}>
                <Text style={styles.locationSuccess}>
                  Location captured successfully
                </Text>
                <Text style={styles.coordinateText}>
                  Latitude: {customerLocation.latitude.toFixed(5)}
                </Text>
                <Text style={styles.coordinateText}>
                  Longitude: {customerLocation.longitude.toFixed(5)}
                </Text>
              </View>
            ) : null}
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.errorMessage}>
              {errorMessage}
            </Text>
          ) : null}

          <AppButton
            disabled={isSubmitting || isLocating}
            label={isSubmitting ? 'Submitting...' : 'Submit Request'}
            onPress={handleSubmit}
          />
          <AppButton
            disabled={isSubmitting || isLocating}
            label="Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    gap: spacing.large,
    alignSelf: 'center',
    maxWidth: 760,
    padding: spacing.large,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radius.large,
    borderWidth: 1,
    gap: spacing.small,
    padding: spacing.large,
    ...shadows.small,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.medium,
    paddingVertical: 11,
  },
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedOptionText: {
    color: colors.surface,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: spacing.medium,
  },
  imagePreviewCard: {
    gap: spacing.small,
  },
  imagePreview: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.large,
    borderWidth: 1,
    height: 220,
    width: '100%',
  },
  locationSection: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radius.large,
    borderWidth: 1,
    gap: spacing.small,
    padding: spacing.large,
    ...shadows.small,
  },
  sectionHint: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  locationConfirmation: {
    backgroundColor: colors.successSoft,
    borderColor: '#abefc6',
    borderRadius: radius.large,
    borderWidth: 1,
    gap: 4,
    padding: spacing.medium,
  },
  locationSuccess: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  coordinateText: {
    color: colors.text,
    fontSize: 14,
  },
  errorMessage: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.medium,
    color: colors.error,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
