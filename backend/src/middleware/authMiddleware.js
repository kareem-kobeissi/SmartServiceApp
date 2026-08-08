const jwt = require('jsonwebtoken');

function requireAuth(request, response, next) {
  const authorizationHeader = request.get('Authorization');

  if (
    !authorizationHeader ||
    !authorizationHeader.startsWith('Bearer ')
  ) {
    return response.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    return response.status(401).json({
      success: false,
      message: 'Authentication is required.',
    });
  }

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({
      success: false,
      message: 'Authentication is not configured.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    request.user = {
      id: payload.userId,
      role: payload.role,
    };

    return next();
  } catch {
    return response.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return function authorizeRole(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        success: false,
        message: 'Authentication is required.',
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

module.exports = {
  authorizeRoles,
  requireAuth,
};
