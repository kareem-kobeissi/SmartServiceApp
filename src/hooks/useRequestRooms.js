import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { joinRequestRoom, leaveRequestRoom } from '../services/realtime';

export default function useRequestRooms(requestIds) {
  const { realtimeStatus } = useAuth();
  const stableIds = [...new Set(requestIds.filter(Boolean).map(String))].sort();
  const roomKey = stableIds.join('|');

  useEffect(() => {
    if (realtimeStatus !== 'connected') return undefined;
    stableIds.forEach(joinRequestRoom);
    return () => stableIds.forEach(leaveRequestRoom);
  }, [realtimeStatus, roomKey]);
}
