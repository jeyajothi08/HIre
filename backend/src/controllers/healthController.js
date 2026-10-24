import { getDBStatus } from '../config/db.js';

/**
 * @desc   Check API health and status
 * @route  GET /api/v1/health
 * @access Public
 */
export const checkHealth = (req, res) => {
  const dbStatus = getDBStatus();

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
      note: dbStatus.isConfigured 
        ? (dbStatus.status === 'connected' ? 'Database connected' : 'Connecting to database') 
        : 'MONGO_URI not configured in .env yet',
    },
  });
};
