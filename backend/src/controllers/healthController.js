import { getDBStatus } from '../config/db.js';

/**
 * @desc   Check API health and real database status
 * @route  GET /api/v1/health
 * @access Public
 */
export const checkHealth = (req, res) => {
  const dbStatus = getDBStatus();

  let note = 'MONGO_URI not configured in .env yet';
  if (dbStatus.isConfigured) {
    if (dbStatus.status === 'connected') {
      note = `Database successfully connected to ${dbStatus.host || 'MongoDB cluster'}`;
    } else if (dbStatus.errorCategory) {
      note = `Database connection error: ${dbStatus.errorCategory}`;
    } else {
      note = 'Connecting to database...';
    }
  }

  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'HireHub API Server',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.status,
      configured: dbStatus.isConfigured,
      host: dbStatus.host,
      databaseName: dbStatus.databaseName,
      errorCategory: dbStatus.errorCategory,
      troubleshooting: dbStatus.troubleshooting,
      note,
    },
  });
};
