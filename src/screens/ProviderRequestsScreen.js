import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import PriorityBadge from '../components/PriorityBadge';
import ServiceEstimate from '../components/ServiceEstimate';
import RequestProgressTimeline from '../components/RequestProgressTimeline';
import RequestCleanupButton from '../components/RequestCleanupButton';
import RequestStatusBadge from '../components/RequestStatusBadge';
import { SERVICE_TYPE_OPTIONS } from '../constants/serviceTypes';
import { colors, radius, shadows, spacing } from '../constants/theme';
import useFocusPolling from '../hooks/useFocusPolling';
import useRequestRooms from '../hooks/useRequestRooms';
import {
  getProviderRequests,
  hideProviderRequest,
  respondToProviderRequest,
  updateProviderRequestStatus,
} from '../services/api';

const serviceLabels = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((service) => [service.value, service.label]),
);

const LIFECYCLE_ACTIONS = {
  accepted: { label: 'Start Trip', nextStatus: 'on_the_way' },
  on_the_way: { label: 'Mark as Arrived', nextStatus: 'arrived' },
  arrived: { label: 'Start Service', nextStatus: 'in_progress' },
  in_progress: { label: 'Complete Service', nextStatus: 'completed' },
};
const CLEANUP_STATUSES = ['rejected', 'completed', 'cancelled'];


function formatStatus(status) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ProviderRequestsScreen({ navigation }) {
  const [respondingRequestId, setRespondingRequestId] = useState(null);
  const [updatingStatusRequestId, setUpdatingStatusRequestId] =
    useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRequests = useCallback(async () => {
    const result = await getProviderRequests();
    return result.requests;
  }, []);
  const {
    connectionMessage,
    data: requests,
    initialError,
    isInitialLoading,
    setData: setRequests,
  } = useFocusPolling(fetchRequests, []);
  useRequestRooms(requests.map((request) => request.id));

  async function handleResponse(requestId, action) {
    setErrorMessage('');
    setSuccessMessage('');
    setRespondingRequestId(requestId);

    try {
      const result = await respondToProviderRequest(requestId, action);
      setRequests((currentRequests) =>
        action === 'accept'
          ? currentRequests.map((request) =>
              request.id === requestId
                ? { ...request, ...result.request }
                : request,
            )
          : currentRequests.filter((request) => request.id !== requestId),
      );
      setSuccessMessage(
        action === 'accept'
          ? 'Request accepted successfully.'
          : 'Request rejected successfully.',
      );
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to respond to this request.',
      );
    } finally {
      setRespondingRequestId(null);
    }
  }

  async function submitStatusUpdate(requestId, action) {
    setErrorMessage('');
    setSuccessMessage('');
    setUpdatingStatusRequestId(requestId);

    try {
      const result = await updateProviderRequestStatus(
        requestId,
        action.nextStatus,
      );
      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? { ...request, ...result.request }
            : request,
        ),
      );
      setSuccessMessage(`Request updated to ${formatStatus(action.nextStatus)}.`);
      if (action.nextStatus === 'on_the_way') {
        const prompt = 'Trip started. Start sharing your live location with the customer?';
        if (Platform.OS === 'web') {
          if (globalThis.confirm(prompt)) navigation.navigate('Tracking', { requestId });
        } else {
          Alert.alert('Share live location', prompt, [
            { text: 'Later', style: 'cancel' },
            { text: 'Start Sharing', onPress: () => navigation.navigate('Tracking', { requestId }) },
          ]);
        }
      }
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to update the request status.',
      );
    } finally {
      setUpdatingStatusRequestId(null);
    }
  }

  function confirmStatusUpdate(request) {
    const action = LIFECYCLE_ACTIONS[request.status];

    if (!action) {
      return;
    }

    const message = `${action.label} for ${request.customerName}?`;

    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) {
        submitStatusUpdate(request.id, action);
      }
      return;
    }

    Alert.alert('Update service status', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => submitStatusUpdate(request.id, action),
      },
    ]);
  }

  const controlsDisabled =
    isInitialLoading ||
    Boolean(respondingRequestId) ||
    Boolean(updatingStatusRequestId);
  const activeRequests = requests.filter(
    (request) => request.status !== 'completed',
  );
  const completedRequests = requests.filter(
    (request) => request.status === 'completed',
  );

  function renderRequestCard(request) {
    const lifecycleAction = LIFECYCLE_ACTIONS[request.status];

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{request.customerName}</Text>
          <RequestStatusBadge label={formatStatus(request.status)} status={request.status} />
        </View>
        <Text style={styles.detail}>
          Service: {serviceLabels[request.serviceType]}
        </Text>
        <Text style={styles.description}>{request.description}</Text>
        <PriorityBadge
          level={request.priorityLevel}
          reason={request.priorityReason}
        />
        <ServiceEstimate request={request} />
        <Text style={styles.distance}>
          Distance: {request.distanceKm.toFixed(2)} km
        </Text>
        <Text style={styles.date}>
          Created: {new Date(request.createdAt).toLocaleString()}
        </Text>
        <RequestProgressTimeline status={request.status} />
        {request.status === 'offered' ? (
          <View style={styles.actions}>
            <AppButton
              disabled={controlsDisabled}
              label={
                respondingRequestId === request.id
                  ? 'Responding...'
                  : 'Accept'
              }
              onPress={() => handleResponse(request.id, 'accept')}
            />
            <AppButton
              disabled={controlsDisabled}
              label="Reject"
              onPress={() => handleResponse(request.id, 'reject')}
              variant="secondary"
            />
          </View>
        ) : null}
        {lifecycleAction ? (
          <AppButton
            disabled={controlsDisabled}
            label={
              updatingStatusRequestId === request.id
                ? 'Updating...'
                : lifecycleAction.label
            }
            onPress={() => confirmStatusUpdate(request)}
          />
        ) : null}
        {['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(
          request.status,
        ) ? (
          <AppButton
            label="Live Location Sharing"
            onPress={() => navigation.navigate('Tracking', { requestId: request.id })}
            variant="secondary"
          />
        ) : null}
        {CLEANUP_STATUSES.includes(request.status) ? (
          <RequestCleanupButton
            onRemoved={(requestId) =>
              setRequests((currentRequests) =>
                currentRequests.filter((item) => item.id !== requestId),
              )
            }
            removeRequest={hideProviderRequest}
            requestId={request.id}
          />
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Incoming Requests</Text>

        {successMessage ? (
          <Text accessibilityRole="alert" style={styles.successMessage}>
            {successMessage}
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
            <Text style={styles.helperText}>Loading requests...</Text>
          </View>
        ) : initialError && requests.length === 0 ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {initialError}
          </Text>
        ) : requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No incoming requests</Text>
            <Text style={styles.helperText}>
              New offers and active requests will appear here.
            </Text>
          </View>
        ) : (
          <>
            {activeRequests.length > 0 ? (
              <View style={styles.requests}>
                <Text style={styles.sectionTitle}>Active requests</Text>
                {activeRequests.map(renderRequestCard)}
              </View>
            ) : null}
            {completedRequests.length > 0 ? (
              <View style={styles.requests}>
                <Text style={styles.sectionTitle}>Completed history</Text>
                {completedRequests.map(renderRequestCard)}
              </View>
            ) : null}
          </>
        )}

        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {errorMessage}
          </Text>
        ) : null}
        <AppButton
          disabled={
            Boolean(respondingRequestId) ||
            Boolean(updatingStatusRequestId)
          }
          label="Back to Provider Home"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{backgroundColor:colors.background,flex:1},container:{alignSelf:'center',flexGrow:1,gap:spacing.large,maxWidth:820,padding:spacing.large,width:'100%'},title:{color:colors.text,fontSize:30,fontWeight:'800',letterSpacing:-0.7},loadingContainer:{alignItems:'center',backgroundColor:colors.surface,borderRadius:radius.large,gap:spacing.medium,paddingVertical:spacing.extraLarge},helperText:{color:colors.mutedText,fontSize:13,lineHeight:20,textAlign:'center'},emptyCard:{alignItems:'center',backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:spacing.small,padding:spacing.extraLarge,...shadows.small},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'800'},requests:{gap:spacing.medium},sectionTitle:{color:colors.text,fontSize:18,fontWeight:'800',letterSpacing:-0.2},requestCard:{backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:12,padding:spacing.large,...shadows.small},cardHeader:{alignItems:'flex-start',flexDirection:'row',gap:spacing.small,justifyContent:'space-between'},customerName:{color:colors.text,flex:1,fontSize:18,fontWeight:'800'},status:{backgroundColor:colors.primarySoft,borderRadius:radius.pill,color:colors.primary,fontSize:11,fontWeight:'800',overflow:'hidden',paddingHorizontal:10,paddingVertical:6,textTransform:'uppercase'},detail:{color:colors.mutedText,fontSize:13,fontWeight:'700',textTransform:'uppercase'},description:{color:colors.text,fontSize:15,lineHeight:22},distance:{color:colors.accent,fontSize:14,fontWeight:'800'},date:{color:colors.subtleText,fontSize:12},actions:{gap:spacing.small,marginTop:spacing.small},errorMessage:{backgroundColor:colors.errorSoft,borderRadius:radius.medium,color:colors.error,fontSize:14,padding:12,textAlign:'center'},successMessage:{backgroundColor:colors.successSoft,borderRadius:radius.medium,color:colors.success,fontSize:14,fontWeight:'700',padding:12,textAlign:'center'},connectionMessage:{color:colors.warning,fontSize:13,textAlign:'center'}
});