import './config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/healthRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Reverse Proxy Configuration:
// When deployed behind a single trusted reverse proxy or cloud load balancer (e.g. Render, Railway,
// AWS ALB, or Nginx), trust exactly 1 upstream hop (the immediate front-facing proxy).
// This ensures req.ip and express-rate-limit correctly identify real client IPs rather than
// grouping all user requests under the load balancer IP, while preventing arbitrary client IP spoofing.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", process.env.CLIENT_URL || '*'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Allowed origins for CORS (Vite development and configured client URL)
const clientOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...clientOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (
        !origin || 
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true, // Required for httpOnly cookies across origins
  })
);

// Body and Cookie parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets from frontend/dist (JS, CSS, SVGs, favicon)
app.use(express.static(clientDistPath, { index: false }));

// API Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Unknown API routes handler - ensures /api/* NEVER falls through to index.html
app.all('/api/{*path}', (req, res, next) => {
  notFound(req, res, next);
});

// Root route: serves frontend index.html for browsers, or API welcome JSON for API clients
app.get('/', (req, res) => {
  const isHtmlRequest = req.headers.accept && req.headers.accept.includes('text/html');
  const indexPath = path.join(clientDistPath, 'index.html');

  if (isHtmlRequest && fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(200).json({
    message: 'Welcome to HireHub API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      jobs: '/api/v1/jobs',
      auth: '/api/v1/auth',
      applications: '/api/v1/applications',
      profile: '/api/v1/profile',
      notifications: '/api/v1/notifications',
      admin: '/api/v1/admin',
    },
  });
});

// SPA client-side fallback for all frontend navigation routes (e.g. /jobs, /login, /profile)
app.get('{*path}', (req, res, next) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;
