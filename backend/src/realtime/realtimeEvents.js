let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
}

function getSocketServer() {
  return socketServer;
}

function emitToRooms(eventName, rooms, payload) {
  if (!socketServer) return false;
  const targetRooms = [...new Set(rooms.filter(Boolean))];
  if (!targetRooms.length) return false;
  let operator = socketServer.to(targetRooms[0]);
  targetRooms.slice(1).forEach((room) => {
    operator = operator.to(room);
  });
  operator.emit(eventName, payload);
  return true;
}

function emitRequestEvent(eventName, details) {
  const { customerId, providerId, requestId, status, extra = {} } = details;
  return emitToRooms(
    eventName,
    [
      customerId ? `user:${String(customerId)}` : null,
      providerId ? `user:${String(providerId)}` : null,
      requestId ? `request:${String(requestId)}` : null,
    ],
    { requestId: String(requestId), ...(status ? { status } : {}), ...extra },
  );
}

function removeUserFromRequestRoom(userId, requestId) {
  if (!socketServer || !userId || !requestId) return false;
  socketServer
    .in(`user:${String(userId)}`)
    .socketsLeave(`request:${String(requestId)}`);
  return true;
}

function emitLocationSharingStopped({ customerId, providerId, requestId, status, timestamp }) {
  return emitToRooms(
    'provider:locationSharingStopped',
    [
      customerId ? `user:${String(customerId)}` : null,
      providerId ? `user:${String(providerId)}` : null,
      requestId ? `request:${String(requestId)}` : null,
    ],
    {
      requestId: String(requestId),
      status,
      timestamp: new Date(timestamp || Date.now()).toISOString(),
    },
  );
}
function emitProviderAvailability(providerId, availabilityStatus) {
  return emitToRooms(
    'provider:availabilityChanged',
    [`user:${String(providerId)}`, 'role:customer'],
    { providerId: String(providerId), availabilityStatus },
  );
}

module.exports = {
  emitLocationSharingStopped,
  emitProviderAvailability,
  emitRequestEvent,
  emitToRooms,
  getSocketServer,
  removeUserFromRequestRoom,
  setSocketServer,
};
