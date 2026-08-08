import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { colors, radius, shadows, spacing } from '../constants/theme';
import {
  PROVIDER_AVAILABILITY_OPTIONS,
  PROVIDER_SERVICE_OPTIONS,
} from '../constants/providerOptions';
import { useAuth } from '../context/AuthContext';
import {
  getProviderProfile,
  updateProviderLocation,
  updateProviderProfile,
} from '../services/api';
import { subscribeRealtimeEvents } from '../services/realtime';

const LOCATION_TIMEOUT_MS = 15000;

export default function ProviderHomeScreen({ navigation }) {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('offline');
  const [savedAvailabilityStatus, setSavedAvailabilityStatus] =
    useState('offline');
  const [providerLocation, setProviderLocation] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await getProviderProfile();
      setServiceTypes(result.provider.serviceTypes);
      setAvailabilityStatus(result.provider.availabilityStatus);
      setSavedAvailabilityStatus(result.provider.availabilityStatus);
      setProviderLocation(
        result.provider.locationAvailable
          ? {
              latitude: result.provider.latitude,
              longitude: result.provider.longitude,
            }
          : null,
      );
      setLocationUpdatedAt(result.provider.locationUpdatedAt);
      setAverageRating(result.provider.averageRating || 0);
      setRatingCount(result.provider.ratingCount || 0);
    } catch (error) {
      setHasLoadError(true);
      setErrorMessage(
        error.message || 'Unable to load the provider profile.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleUpdateLocation() {
    setErrorMessage('');
    setSuccessMessage('');
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
          'Location permission was denied. Allow foreground location access to update your position.',
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

      const result = await updateProviderLocation({
        latitude,
        longitude,
      });
      setProviderLocation({
        latitude: result.provider.latitude,
        longitude: result.provider.longitude,
      });
      setLocationUpdatedAt(result.provider.locationUpdatedAt);
      setSuccessMessage('Location updated successfully.');
    } catch (error) {
      if (error.message === 'LOCATION_TIMEOUT') {
        setErrorMessage(
          'Location timed out. Move to an open area and try again.',
        );
      } else {
        setErrorMessage(
          error.message ||
            'Unable to capture and save your current location.',
        );
      }
    } finally {
      setIsLocating(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  useEffect(() =>
    subscribeRealtimeEvents((eventName) => {
      if (
        eventName === 'provider:availabilityChanged' ||
        eventName === 'request:rated'
      ) {
        loadProfile();
      }
    }),
  [loadProfile]);

  function toggleService(serviceType) {
    setSuccessMessage('');
    setErrorMessage('');
    setServiceTypes((currentServiceTypes) =>
      currentServiceTypes.includes(serviceType)
        ? currentServiceTypes.filter((value) => value !== serviceType)
        : [...currentServiceTypes, serviceType],
    );
  }

  async function handleSave() {
    setErrorMessage('');
    setSuccessMessage('');
    setHasLoadError(false);

    if (
      availabilityStatus === 'available' &&
      serviceTypes.length === 0
    ) {
      setErrorMessage(
        'Select at least one service before becoming available.',
      );
      return;
    }

    if (availabilityStatus === 'available' && !providerLocation) {
      setErrorMessage(
        'Save your current location before becoming available.',
      );
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateProviderProfile({
        serviceTypes,
        availabilityStatus,
      });
      setServiceTypes(result.provider.serviceTypes);
      setAvailabilityStatus(result.provider.availabilityStatus);
      setSavedAvailabilityStatus(result.provider.availabilityStatus);
      setSuccessMessage('Provider profile saved successfully.');
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to save the provider profile.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      setErrorMessage('Unable to log out. Please try again.');
      setIsLoggingOut(false);
    }
  }

  const controlsDisabled =
    isLoading || isLocating || isSaving || isLoggingOut;
  const savedStatusLabel =
    savedAvailabilityStatus.charAt(0).toUpperCase() +
    savedAvailabilityStatus.slice(1);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingBottom: spacing.huge + insets.bottom },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName?.charAt(0).toUpperCase()}</Text></View>
            <View style={styles.heroCopy}><Text style={styles.eyebrow}>SERVICE PROVIDER</Text><Text style={styles.title}>Welcome, {user.fullName}</Text><Text style={styles.role}>Manage your services, location and incoming work.</Text></View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>CURRENT STATUS</Text><View style={[styles.statusPill,savedAvailabilityStatus==='available'?styles.availablePill:savedAvailabilityStatus==='busy'?styles.busyPill:styles.offlinePill]}><Text style={styles.statusPillText}>{savedStatusLabel}</Text></View></View>
            <View style={styles.metricCard}><Text style={styles.metricLabel}>CUSTOMER RATING</Text><Text style={styles.ratingValue}>{ratingCount?`${averageRating.toFixed(1)} / 5`:'New provider'}</Text><Text style={styles.metricHint}>{ratingCount} {ratingCount===1?'rating':'ratings'}</Text></View>
          </View>

          {isLoading?<View style={styles.loadingContainer}><ActivityIndicator color={colors.primary} size="large"/><Text style={styles.helperText}>Loading provider profile...</Text></View>:(
            <>
              <View style={styles.panel}><View style={styles.sectionHeader}><Text style={styles.sectionNumber}>01</Text><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Your services</Text><Text style={styles.helperText}>Select every service customers can request from you.</Text></View></View><View style={styles.options}>{PROVIDER_SERVICE_OPTIONS.map((service)=>{const isSelected=serviceTypes.includes(service.value);return <Pressable accessibilityRole="checkbox" accessibilityState={{checked:isSelected}} disabled={controlsDisabled} key={service.value} onPress={()=>toggleService(service.value)} style={({pressed})=>[styles.option,isSelected&&styles.selectedOption,pressed&&styles.pressedOption]}><Text style={[styles.optionText,isSelected&&styles.selectedOptionText]}>{isSelected?'✓  ':''}{service.label}</Text></Pressable>})}</View></View>

              <View style={styles.panel}><View style={styles.sectionHeader}><Text style={styles.sectionNumber}>02</Text><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Current location</Text><Text style={styles.helperText}>Update your position so nearby customers can discover you.</Text></View></View><AppButton disabled={controlsDisabled} label={isLocating?'Updating Your Location...':'Update My Current Location'} onPress={handleUpdateLocation} variant="secondary"/>{providerLocation?<View style={styles.locationCard}><View style={styles.locationHeader}><View style={styles.successDot}/><Text style={styles.locationSuccess}>Location saved successfully</Text></View><Text style={styles.locationText}>Latitude: {providerLocation.latitude.toFixed(5)}</Text><Text style={styles.locationText}>Longitude: {providerLocation.longitude.toFixed(5)}</Text><Text style={styles.locationUpdated}>Last updated: {locationUpdatedAt?new Date(locationUpdatedAt).toLocaleString():'Unknown'}</Text></View>:<Text style={styles.helperText}>No provider location has been saved yet.</Text>}</View>

              <View style={styles.panel}><View style={styles.sectionHeader}><Text style={styles.sectionNumber}>03</Text><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>Availability</Text><Text style={styles.helperText}>Available appears in customer searches. Busy pauses new offers.</Text></View></View><View style={styles.options}>{PROVIDER_AVAILABILITY_OPTIONS.map((status)=>{const isSelected=availabilityStatus===status.value;return <Pressable accessibilityRole="radio" accessibilityState={{checked:isSelected}} disabled={controlsDisabled} key={status.value} onPress={()=>{setAvailabilityStatus(status.value);setErrorMessage('');setSuccessMessage('')}} style={({pressed})=>[styles.option,styles.availabilityOption,isSelected&&styles.selectedOption,pressed&&styles.pressedOption]}><Text style={[styles.optionText,isSelected&&styles.selectedOptionText]}>{status.label}</Text></Pressable>})}</View></View>
            </>
          )}

          {errorMessage?<View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text></View>:null}
          {successMessage?<View style={styles.successBox}><Text accessibilityRole="alert" style={styles.successMessage}>{successMessage}</Text></View>:null}

          {!isLoading?<AppButton disabled={controlsDisabled} label={isSaving?'Saving...':'Save Provider Profile'} onPress={handleSave}/>:null}
          <View style={styles.navigationPanel}><View style={styles.workspaceHeader}><Text style={styles.navigationTitle}>Provider workspace</Text><Text style={styles.helperText}>Review assigned jobs and customer feedback.</Text></View><View style={styles.navigationActions}><AppButton disabled={controlsDisabled} label="Incoming Requests" onPress={()=>navigation.navigate('ProviderRequests')} variant="secondary"/><AppButton disabled={controlsDisabled} label="My Reviews" onPress={()=>navigation.navigate('ProviderReviews')} variant="secondary"/></View></View>
          {hasLoadError&&!isLoading?<AppButton disabled={controlsDisabled} label="Reload Profile" onPress={loadProfile} variant="secondary"/>:null}
          <AppButton disabled={controlsDisabled} label={isLoggingOut?'Logging Out...':'Logout'} onPress={handleLogout} variant="secondary"/>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safeArea:{backgroundColor:colors.background,flex:1},page:{flexGrow:1,paddingHorizontal:spacing.large,paddingTop:spacing.large},content:{alignSelf:'center',gap:spacing.large,maxWidth:760,width:'100%'},hero:{alignItems:'center',backgroundColor:colors.primary,borderRadius:radius.extraLarge,flexDirection:'row',gap:spacing.medium,padding:spacing.large,...shadows.card},avatar:{alignItems:'center',backgroundColor:'rgba(255,255,255,0.18)',borderColor:'rgba(255,255,255,0.28)',borderRadius:radius.large,borderWidth:1,height:64,justifyContent:'center',width:64},avatarText:{color:colors.white,fontSize:26,fontWeight:'800'},heroCopy:{flex:1,minWidth:0},eyebrow:{color:'#bfdbfe',fontSize:11,fontWeight:'800',letterSpacing:1.2},title:{color:colors.white,flexShrink:1,fontSize:28,fontWeight:'800',letterSpacing:-0.6,marginTop:4},role:{color:'#dbeafe',flexShrink:1,fontSize:14,lineHeight:20,marginTop:4},metricsRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.medium},metricCard:{backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,flex:1,gap:8,minWidth:210,padding:spacing.medium,...shadows.small},metricLabel:{color:colors.mutedText,fontSize:11,fontWeight:'800',letterSpacing:0.8},statusPill:{alignSelf:'flex-start',borderRadius:radius.pill,paddingHorizontal:12,paddingVertical:6},availablePill:{backgroundColor:colors.successSoft},busyPill:{backgroundColor:colors.orangeSoft},offlinePill:{backgroundColor:colors.surfaceMuted},statusPillText:{color:colors.text,fontSize:15,fontWeight:'800'},ratingValue:{color:colors.warning,fontSize:20,fontWeight:'800'},metricHint:{color:colors.mutedText,fontSize:12},loadingContainer:{alignItems:'center',backgroundColor:colors.surface,borderRadius:radius.large,gap:spacing.medium,padding:spacing.extraLarge},panel:{backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:spacing.medium,padding:spacing.large,...shadows.small},sectionHeader:{alignItems:'flex-start',flexDirection:'row',gap:12},sectionCopy:{flex:1,minWidth:0},sectionNumber:{backgroundColor:colors.primarySoft,borderRadius:radius.medium,color:colors.primary,fontSize:12,fontWeight:'800',overflow:'hidden',padding:10},sectionTitle:{color:colors.text,flexShrink:1,fontSize:18,fontWeight:'800'},helperText:{color:colors.mutedText,fontSize:13,lineHeight:19},options:{flexDirection:'row',flexWrap:'wrap',gap:spacing.small},option:{backgroundColor:colors.surfaceMuted,borderColor:colors.border,borderRadius:radius.pill,borderWidth:1,minHeight:44,paddingHorizontal:spacing.medium,paddingVertical:11},availabilityOption:{flex:1,minWidth:120},selectedOption:{backgroundColor:colors.primary,borderColor:colors.primary},pressedOption:{opacity:0.8},optionText:{color:colors.text,fontSize:14,fontWeight:'700',textAlign:'center'},selectedOptionText:{color:colors.white},locationCard:{backgroundColor:colors.successSoft,borderColor:'#abefc6',borderRadius:radius.medium,borderWidth:1,gap:4,padding:spacing.medium},locationHeader:{alignItems:'center',flexDirection:'row',gap:8},successDot:{backgroundColor:colors.success,borderRadius:5,height:10,width:10},locationSuccess:{color:colors.success,flex:1,flexShrink:1,fontSize:14,fontWeight:'800'},locationText:{color:colors.text,fontSize:14},locationUpdated:{color:colors.mutedText,fontSize:12,marginTop:4},errorBox:{backgroundColor:colors.errorSoft,borderColor:'#fecdca',borderRadius:radius.medium,borderWidth:1,padding:12},errorMessage:{color:colors.error,fontSize:14,textAlign:'center'},successBox:{backgroundColor:colors.successSoft,borderColor:'#abefc6',borderRadius:radius.medium,borderWidth:1,padding:12},successMessage:{color:colors.success,fontSize:14,fontWeight:'700',textAlign:'center'},navigationPanel:{backgroundColor:colors.surfaceMuted,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:spacing.medium,padding:spacing.large},workspaceHeader:{gap:4},navigationTitle:{color:colors.text,fontSize:15,fontWeight:'800'},navigationActions:{gap:10}
});