import './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5001;

let server = null;

async function startServer() {
  try {
    // Validate required production environment variables before accepting traffic
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
        throw new Error('FATAL: JWT_SECRET environment variable is missing or empty in production.');
      }
    }

    // Await database initialization before listening for traffic
    await connectDB();

    server = app.listen(PORT, () => {
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

    // Handle SIGINT (Ctrl + C) gracefully
    process.on('SIGINT', () => {
      console.log('\n🛑 Gracefully shutting down HireHub server...');
      if (server) {
        server.close(() => {
          console.log('✅ Server terminated.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } catch (err) {
    console.error(`❌ Startup aborted: ${err.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

startServer();
