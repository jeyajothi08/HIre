import { getDBStatus } from '../config/db.js';

/**
 * @desc   Check API health and real database status
 * @route  GET /api/v1/health
 * @access Public
 */
export const checkHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const isProd = process.env.NODE_ENV === 'production';

  let note = 'MONGO_URI not configured in .env yet';
  if (dbStatus.isConfigured) {
    if (dbStatus.status === 'connected') {
      if (dbStatus.isInMemory) {
        note = 'Using ephemeral in-memory database (development/test session only; data is volatile)';
      } else {
        note = `Database successfully connected to ${dbStatus.host || 'MongoDB cluster'}`;
      }
    } else if (dbStatus.errorCategory) {
      note = `Database connection error: ${dbStatus.errorCategory}`;
    } else {
      note = 'Connecting to database...';
    }
  } else if (dbStatus.isInMemory) {
    note = 'Using ephemeral in-memory database (development/test session only; data is volatile)';
  }

  // Health status determination:
  // In-memory mode is NEVER reported as production-healthy.
  let overallStatus = 'healthy';
  let httpStatusCode = 200;

  if (dbStatus.status !== 'connected') {
    overallStatus = 'unhealthy';
    if (isProd) httpStatusCode = 503;
  } else if (dbStatus.isInMemory) {
    overallStatus = isProd ? 'unhealthy' : 'degraded';
    if (isProd) httpStatusCode = 503;
  }

  res.status(httpStatusCode).json({
    success: httpStatusCode === 200,
    status: overallStatus,
    service: 'HireHub API Server',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.status,
      configured: dbStatus.isConfigured,
      isInMemory: dbStatus.isInMemory,
      isPersistent: dbStatus.isPersistent,
      databaseType: dbStatus.databaseType,
      host: dbStatus.host,
      databaseName: dbStatus.databaseName,
      errorCategory: dbStatus.errorCategory,
      troubleshooting: dbStatus.troubleshooting,
      note,
    },
  });
};
