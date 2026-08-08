import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import PriorityBadge from '../components/PriorityBadge';
import ServiceEstimate from '../components/ServiceEstimate';
import RequestCleanupButton from '../components/RequestCleanupButton';
import RequestStatusBadge from '../components/RequestStatusBadge';
import RequestProgressTimeline, {
  LIFECYCLE_STATUSES,
} from '../components/RequestProgressTimeline';
import { SERVICE_TYPE_OPTIONS } from '../constants/serviceTypes';
import { colors, radius, shadows, spacing } from '../constants/theme';
import useFocusPolling from '../hooks/useFocusPolling';
import useRequestRooms from '../hooks/useRequestRooms';
import {
  getMyServiceRequests,
  hideCustomerRequest,
} from '../services/api';

const serviceLabels = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((service) => [service.value, service.label]),
);
const CLEANUP_STATUSES = ['rejected', 'completed', 'cancelled'];


function formatStatus(status) {
  if (status === 'offered') {
    return 'Waiting for provider response';
  }

  if (status === 'rejected') {
    return 'Rejected by provider';
  }

  const lifecycleLabels = {
    accepted: 'Provider accepted',
    on_the_way: 'Provider is on the way',
    arrived: 'Provider has arrived',
    in_progress: 'Service is in progress',
    completed: 'Service completed',
  };

  if (lifecycleLabels[status]) {
    return lifecycleLabels[status];
  }

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function MyRequestsScreen({ navigation, route }) {
  const fetchRequests = useCallback(async () => {
    const result = await getMyServiceRequests();
    return result.requests;
  }, []);
  const {
    connectionMessage,
    data: requests,
    initialError,
    setData: setRequests,
    isInitialLoading,
  } = useFocusPolling(fetchRequests, []);
  useRequestRooms(requests.map((request) => request.id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Requests</Text>
        {route.params?.notice ? (
          <Text accessibilityRole="alert" style={styles.successMessage}>
            {route.params.notice}
          </Text>
        ) : null}
        {connectionMessage ? (
          <Text accessibilityRole="alert" style={styles.connectionMessage}>
            {connectionMessage}
          </Text>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.helperText}>Loading your requests...</Text>
          </View>
        ) : initialError ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {initialError}
          </Text>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No service requests yet</Text>
            <Text style={styles.helperText}>
              Create your first request when you need help.
            </Text>
          </View>
        ) : (
          <View style={styles.requests}>
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceType}>
                    {serviceLabels[request.serviceType] ||
                      request.serviceType}
                  </Text>
                  <RequestStatusBadge
                    label={formatStatus(request.status)}
                    status={request.status}
                  />
                </View>
                <Text style={styles.description}>
                  {request.description}
                </Text>
                <PriorityBadge
                  level={request.priorityLevel}
                  reason={request.priorityReason}
                />
                <ServiceEstimate request={request} />
                {request.customerLocation ? (
                  <Text style={styles.locationIndicator}>
                    Location attached
                  </Text>
                ) : null}
                {request.provider?.fullName ? (
                  <Text style={styles.providerName}>
                    Selected provider: {request.provider.fullName}
                  </Text>
                ) : null}
                {request.lastRejectedProvider?.fullName ? (
                  <Text style={styles.rejectedProviderName}>
                    Last rejected by:{' '}
                    {request.lastRejectedProvider.fullName}
                  </Text>
                ) : null}
                {LIFECYCLE_STATUSES.some(
                  (step) => step.value === request.status,
                ) ? (
                  <RequestProgressTimeline status={request.status} />
                ) : null}
                {request.status === 'completed' ? (
                  <Text style={styles.completionMessage}>
                    {request.isRated
                      ? `Rated: ${request.rating?.score || ''} out of 5`
                      : 'Service completed — you can now rate your provider.'}
                  </Text>
                ) : null}
                <Text style={styles.date}>
                  {new Date(request.createdAt).toLocaleString()}
                </Text>
                {['pending', 'rejected'].includes(request.status) &&
                !request.provider ? (
                  <AppButton
                    label={
                      request.status === 'rejected'
                        ? 'Find Another Provider'
                        : 'Find Available Providers'
                    }
                    onPress={() =>
                      navigation.navigate('AvailableProviders', {
                        requestId: request.id,
                        serviceType: request.serviceType,
                      })
                    }
                    variant="secondary"
                  />
                ) : null}
                {['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(
                  request.status,
                ) && request.provider ? (
                  <AppButton
                    label="Track Provider"
                    onPress={() =>
                      navigation.navigate('Tracking', { requestId: request.id })
                    }
                  />
                ) : null}
                {request.status === 'completed' && !request.isRated ? (
                  <AppButton
                    label="Rate Provider"
                    onPress={() =>
                      navigation.navigate('Rating', {
                        requestId: request.id,
                        providerName:
                          request.provider?.fullName || 'your provider',
                      })
                    }
                  />
                ) : null}
                {CLEANUP_STATUSES.includes(request.status) ? (
                  <RequestCleanupButton
                    onRemoved={(requestId) =>
                      setRequests((currentRequests) =>
                        currentRequests.filter((item) => item.id !== requestId),
                      )
                    }
                    removeRequest={hideCustomerRequest}
                    requestId={request.id}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}

        <AppButton
          label="Request a Service"
          onPress={() => navigation.navigate('CreateRequest')}
        />
        <AppButton
          label="Back to Home"
          onPress={() => navigation.navigate('CustomerHome')}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safeArea:{backgroundColor:colors.background,flex:1},container:{alignSelf:'center',flexGrow:1,gap:spacing.large,maxWidth:820,padding:spacing.large,width:'100%'},title:{color:colors.text,fontSize:30,fontWeight:'800',letterSpacing:-0.7},successMessage:{backgroundColor:colors.successSoft,borderRadius:radius.medium,color:colors.success,fontSize:14,fontWeight:'700',padding:12,textAlign:'center'},loadingContainer:{alignItems:'center',backgroundColor:colors.surface,borderRadius:radius.large,gap:spacing.medium,paddingVertical:spacing.extraLarge},helperText:{color:colors.mutedText,fontSize:13,lineHeight:20,textAlign:'center'},emptyCard:{alignItems:'center',backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:spacing.small,padding:spacing.extraLarge,...shadows.small},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'800'},requests:{gap:spacing.medium},requestCard:{backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:12,padding:spacing.large,...shadows.small},cardHeader:{alignItems:'flex-start',flexDirection:'row',gap:spacing.small,justifyContent:'space-between'},serviceType:{color:colors.text,flex:1,fontSize:18,fontWeight:'800'},status:{backgroundColor:colors.primarySoft,borderRadius:radius.pill,color:colors.primary,fontSize:11,fontWeight:'800',maxWidth:'52%',overflow:'hidden',paddingHorizontal:10,paddingVertical:6,textAlign:'right',textTransform:'uppercase'},description:{color:colors.text,fontSize:15,lineHeight:22},date:{color:colors.subtleText,fontSize:12},locationIndicator:{color:colors.success,fontSize:13,fontWeight:'700'},providerName:{color:colors.text,fontSize:14,fontWeight:'700'},rejectedProviderName:{color:colors.warning,fontSize:14,fontWeight:'700'},connectionMessage:{color:colors.warning,fontSize:13,textAlign:'center'},completionMessage:{backgroundColor:colors.successSoft,borderRadius:radius.medium,color:colors.success,fontSize:14,fontWeight:'700',padding:10},errorMessage:{backgroundColor:colors.errorSoft,borderRadius:radius.medium,color:colors.error,fontSize:14,padding:12,textAlign:'center'}});