import { io } from 'socket.io-client';

import { API_BASE_URL } from '../constants/config';

export const REALTIME_EVENTS = [
  'request:created',
  'request:offered',
  'request:accepted',
  'request:rejected',
  'request:statusChanged',
  'request:completed',
  'request:rated',
  'request:hidden',
  'provider:availabilityChanged',
  'provider:locationUpdated',
  'provider:locationSharingStarted',
  'provider:locationSharingStopped',
];

let socket = null;
let status = 'offline';
const statusListeners = new Set();
const authenticationFailureListeners = new Set();

function publishStatus(nextStatus) {
  status = nextStatus;
  statusListeners.forEach((listener) => listener(nextStatus));
}

function publishAuthenticationFailure() {
  authenticationFailureListeners.forEach((listener) => listener());
}

export function connectRealtime(token) {
  disconnectRealtime();

  if (!token || !API_BASE_URL) {
    publishStatus('offline');
    return;
  }

  publishStatus('reconnecting');
  socket = io(API_BASE_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => publishStatus('connected'));
  socket.on('disconnect', (reason) => {
    publishStatus(reason === 'io client disconnect' ? 'offline' : 'reconnecting');
  });
  socket.io.on('reconnect_attempt', () => publishStatus('reconnecting'));
  socket.on('connect_error', (error) => {
    const message = error?.message || '';
    if (
      message.includes('Invalid or expired') ||
      message.includes('Authentication is required')
    ) {
      publishStatus('offline');
      publishAuthenticationFailure();
      socket?.disconnect();
      return;
    }
    publishStatus('reconnecting');
  });
}

export function disconnectRealtime() {
  if (socket) {
    REALTIME_EVENTS.forEach((eventName) => socket.off(eventName));
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  publishStatus('offline');
}

export function subscribeRealtimeEvents(listener) {
  if (!socket) return () => {};
  const registrations = REALTIME_EVENTS.map((eventName) => {
    const handler = (payload) => listener(eventName, payload);
    socket.on(eventName, handler);
    return { eventName, handler };
  });
  return () => {
    registrations.forEach(({ eventName, handler }) => {
      socket?.off(eventName, handler);
    });
  };
}

export function subscribeRealtimeStatus(listener) {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

export function subscribeRealtimeAuthenticationFailure(listener) {
  authenticationFailureListeners.add(listener);
  return () => authenticationFailureListeners.delete(listener);
}

export function joinRequestRoom(requestId) {
  if (!socket?.connected || !requestId) return;
  socket.emit('request:join', String(requestId), () => {});
}

export function leaveRequestRoom(requestId) {
  if (socket?.connected && requestId) {
    socket.emit('request:leave', String(requestId));
  }
}

export function getRealtimeStatus() {
  return status;
}

export function sendProviderLocationUpdate(payload) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Real-time connection is offline.'));
      return;
    }

    socket.timeout(10000).emit(
      'provider:locationUpdate',
      payload,
      (timeoutError, result) => {
        if (timeoutError) {
          reject(new Error('The location update timed out.'));
        } else if (!result?.success) {
          reject(new Error(result?.message || 'Unable to send the location update.'));
        } else {
          resolve(result.update);
        }
      },
    );
  });
}
function emitWithAcknowledgement(eventName, payload) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Real-time connection is offline.'));
      return;
    }
    const acknowledgement = (timeoutError, result) => {
      if (timeoutError) reject(new Error('The sharing update timed out.'));
      else if (!result?.success) reject(new Error(result?.message || 'Unable to update location sharing.'));
      else resolve(result);
    };
    if (payload === undefined) socket.timeout(10000).emit(eventName, acknowledgement);
    else socket.timeout(10000).emit(eventName, payload, acknowledgement);
  });
}

export async function startProviderLocationSharing(requestId) {
  const result = await emitWithAcknowledgement('provider:locationSharingStart', { requestId });
  return result.update;
}

export async function stopProviderLocationSharing(requestId) {
  const result = await emitWithAcknowledgement('provider:locationSharingStop', { requestId });
  return result.update;
}

export function stopAllProviderLocationSharing() {
  return emitWithAcknowledgement('provider:locationSharingStopAll');
}