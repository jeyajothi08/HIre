/**
 * 404 Not Found Middleware
 * Intercepts requests that do not match any defined routes.
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware
 * Catches all runtime errors and returns a standardized JSON response.
 */
export const errorHandler = (err, req, res, next) => {
  // If status is still 200 OK, default to 500 Internal Server Error
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
