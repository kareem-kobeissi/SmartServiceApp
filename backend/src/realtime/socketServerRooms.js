function userRoom(userId) {
  return `user:${String(userId)}`;
}

function requestRoom(requestId) {
  return `request:${String(requestId)}`;
}

module.exports = { requestRoom, userRoom };
