import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware:
 * Validates JWT token from httpOnly cookie or Authorization Bearer header.
 * Attaches authenticated user document to req.user.
 */
export const protect = async (req, res, next) => {
  let token = null;

  // 1. Check for token in httpOnly cookie first (best practice for browsers)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization: Bearer <token> (for mobile apps or automated API tests)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_mode_only';
    const decoded = jwt.verify(token, secret);

    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

/**
 * Role-based authorization middleware:
 * Restricts access to specified user roles (e.g. 'employer', 'admin').
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: this action requires one of the following roles: ${roles.join(', ')}. Your current role is '${req.user?.role || 'anonymous'}'.`,
      });
    }
    next();
  };
};
