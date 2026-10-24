import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory and load .env explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5001;

// Attempt database connection (honest check without pretending)
connectDB();

const server = app.listen(PORT, () => {
  console.log(`🚀 HireHub API Server is running on port ${PORT}`);
  console.log(`👉 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🌐 Allowed CORS Origins: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

// Server-level error handling (e.g. EADDRINUSE)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please choose another port in .env`);
  } else {
    console.error(`❌ Server error: ${error.message}`);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle SIGINT (Ctrl + C) gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down HireHub server...');
  server.close(() => {
    console.log('✅ Server terminated.');
    process.exit(0);
  });
});
