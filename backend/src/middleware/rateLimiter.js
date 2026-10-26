import rateLimit from 'express-rate-limit';

/**
 * Authentication rate limiter:
 * Limits login and registration attempts to prevent brute-force credential stuffing.
 * Allows 20 attempts per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});
