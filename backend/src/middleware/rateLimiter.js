import rateLimit from 'express-rate-limit';

/**
 * Authentication rate limiter:
 * Limits login and registration attempts to prevent brute-force credential stuffing.
 * Allows 20 attempts per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 1000, // Safe production threshold, generous for dev/tests
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});
