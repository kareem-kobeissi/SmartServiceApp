const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const ServiceRequest = require('../models/ServiceRequest');
const { createProviderLocationHandlers } = require('./providerLocationHandler');

function userRoom(userId) {
  return `user:${String(userId)}`;
}

function requestRoom(requestId) {
  return `request:${String(requestId)}`;
}

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || !token.trim()) {
    return next(new Error('Authentication is required.'));
  }
  if (!process.env.JWT_SECRET) {
    return next(new Error('Authentication is not configured.'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.userId || !['customer', 'provider'].includes(payload.role)) {
      return next(new Error('Invalid or expired authentication token.'));
    }
    socket.data.user = { id: String(payload.userId), role: payload.role };
    return next();
  } catch {
    return next(new Error('Invalid or expired authentication token.'));
  }
}

async function canJoinRequestRoom(requestId, user) {
  const serviceRequest = await ServiceRequest.findById(requestId).select(
    'customer provider',
  );
  if (!serviceRequest) return false;
  return (
    String(serviceRequest.customer) === user.id ||
    Boolean(serviceRequest.provider && String(serviceRequest.provider) === user.id)
  );
}

function configureSocketServer(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  const authorizeRequestRoom = options.authorizeRequestRoom || canJoinRequestRoom;
  const {
    handleProviderLocation,
    handleSharingStart,
    handleSharingStop,
    handleSharingStopAll,
  } = createProviderLocationHandlers({
    io,
    ...(options.providerLocationOptions || {}),
  });

  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user.id));
    socket.join(`role:${socket.data.user.role}`);

    socket.on('request:join', async (requestId, acknowledge = () => {}) => {
      try {
        if (typeof requestId !== 'string' || !requestId.trim()) {
          acknowledge({ success: false, message: 'A request ID is required.' });
          return;
        }
        if (!(await authorizeRequestRoom(requestId, socket.data.user))) {
          acknowledge({ success: false, message: 'You cannot access this request room.' });
          return;
        }
        await socket.join(requestRoom(requestId));
        acknowledge({ success: true });
      } catch {
        acknowledge({ success: false, message: 'Unable to join the request room.' });
      }
    });

    socket.on('provider:locationUpdate', (payload, acknowledge) =>
      handleProviderLocation(socket, payload, acknowledge),
    );

    socket.on('provider:locationSharingStart', (payload, acknowledge) =>
      handleSharingStart(socket, payload, acknowledge),
    );
    socket.on('provider:locationSharingStop', (payload, acknowledge) =>
      handleSharingStop(socket, payload, acknowledge),
    );
    socket.on('provider:locationSharingStopAll', (acknowledge) =>
      handleSharingStopAll(socket, acknowledge),
    );
    socket.on('request:leave', (requestId) => {
      if (typeof requestId === 'string' && requestId.trim()) {
        socket.leave(requestRoom(requestId));
      }
    });
  });

  return io;
}

module.exports = {
  authenticateSocket,
  canJoinRequestRoom,
  configureSocketServer,
  requestRoom,
  userRoom,
};
