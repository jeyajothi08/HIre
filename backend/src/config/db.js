import './env.js';
import mongoose from 'mongoose';

let isInMemory = false;
let lastConnectionError = null;

export const setIsInMemory = (val) => {
  isInMemory = Boolean(val);
};

export const getIsInMemory = () => isInMemory;

/**
 * Categorize MongoDB errors into actionable developer-friendly diagnostics
 * without exposing sensitive credentials or passwords.
 */
export const categorizeMongoError = (error) => {
  if (!error) return null;
  const msg = error.message || '';
  const errName = error.name || '';

  if (
    msg.includes('bad auth') || 
    msg.includes('Authentication failed') || 
    error.code === 8000
  ) {
    return {
      category: 'AUTHENTICATION_FAILED',
      title: 'MongoDB Atlas Authentication Failed',
      suggestion: 'Check your database username and password in backend/.env. If your password has special characters like @, #, or %, ensure they are URL-encoded.',
    };
  }

  if (
    errName.includes('ServerSelectionError') ||
    msg.includes('ETIMEDOUT') || 
    msg.includes('Server selection timed out') || 
    msg.includes('MongoServerSelectionError') ||
    msg.includes('Could not connect to any servers') ||
    msg.includes('whitelist')
  ) {
    return {
      category: 'NETWORK_OR_IP_WHITELIST',
      title: 'Connection Timed Out (IP Access Blocked)',
      suggestion: 'In MongoDB Atlas dashboard, go to "Network Access" -> click "Add IP Address" -> add your current client public IP address or production egress CIDR / NAT Gateway IP. Never allow 0.0.0.0/0 in production.',
    };
  }

  if (
    msg.includes('querySrv ENOTFOUND') || 
    msg.includes('querySrv EREFUSED')
  ) {
    return {
      category: 'DNS_HOST_NOT_FOUND',
      title: 'Cluster Hostname Not Found',
      suggestion: 'Check the cluster domain in your MONGO_URI. Ensure there are no typos in the mongodb+srv:// host part.',
    };
  }

  if (
    msg.includes('Invalid scheme') || 
    msg.includes('Invalid connection string')
  ) {
    return {
      category: 'INVALID_URI_FORMAT',
      title: 'Malformed Connection String',
      suggestion: 'Ensure your MONGO_URI starts with "mongodb+srv://" (for Atlas) or "mongodb://" (for local).',
    };
  }

  return {
    category: 'UNKNOWN_CONNECTION_ERROR',
    title: 'MongoDB Connection Failed',
    suggestion: 'Verify your MongoDB Atlas cluster is running and your network connection is active.',
  };
};

/**
 * Seed initial sample job data for in-memory local sessions
 */
const seedSampleJobs = async () => {
  try {
    const Job = (await import('../models/Job.js')).default;
    const count = await Job.countDocuments();
    if (count === 0) {
      await Job.insertMany([
        {
          title: 'Senior Full Stack Engineer',
          company: 'Vercel Ecosystem',
          location: 'San Francisco, CA',
          employmentType: 'Full-time',
          workplaceType: 'Remote',
          description: 'Lead engineering on real-time developer workflows and modern web apps using React 19, Node.js, and MongoDB.',
          skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
          salaryMin: 140000,
          salaryMax: 180000,
        },
        {
          title: 'Distributed Systems Architect',
          company: 'Linear Labs',
          location: 'Austin, TX',
          employmentType: 'Full-time',
          workplaceType: 'Hybrid',
          description: 'Design and implement distributed event-driven systems and high-throughput microservices.',
          skills: ['Node.js', 'Kafka', 'MongoDB', 'Docker'],
          salaryMin: 160000,
          salaryMax: 210000,
        },
        {
          title: 'Frontend UI/UX Developer',
          company: 'Stripe Studios',
          location: 'New York, NY',
          employmentType: 'Full-time',
          workplaceType: 'Remote',
          description: 'Build polished, responsive user interfaces and design systems with modern CSS and React.',
          skills: ['React', 'TailwindCSS', 'TypeScript', 'Figma'],
          salaryMin: 130000,
          salaryMax: 165000,
        },
      ]);
      console.log('🌱 Seeded sample jobs into in-memory database.');
    }
  } catch (err) {
    console.warn('Sample job seeding skipped:', err.message);
  }
};

/**
 * Connect to MongoDB database.
 * In production: fails fast on connection error without fallback.
 * In development: in-memory DB is only enabled via explicit USE_MEMORY_DB=true (or ALLOW_DEV_MEMORY_FALLBACK=true).
 */
export const connectDB = async () => {
  isInMemory = false;
  lastConnectionError = null;

  const isProduction = process.env.NODE_ENV === 'production';
  const forceMemoryDB = process.env.USE_MEMORY_DB === 'true';

  // Explicit in-memory database mode
  if (forceMemoryDB) {
    if (isProduction) {
      const err = new Error('USE_MEMORY_DB is strictly prohibited in production environments.');
      lastConnectionError = err;
      console.error(`❌ Fatal Configuration Error: ${err.message}`);
      throw err;
    }

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      isInMemory = true;
      console.log(`✅ In-Memory MongoDB Connected for local session: ${conn.connection.host}`);
      await seedSampleJobs();
      return conn;
    } catch (err) {
      lastConnectionError = err;
      console.error('Failed to initialize in-memory DB:', err);
      throw err;
    }
  }

  const uri = process.env.MONGO_URI;

  if (!uri || uri.trim() === '') {
    if (isProduction) {
      const err = new Error('MONGO_URI must be configured in production.');
      lastConnectionError = err;
      console.error(`❌ Fatal Configuration Error: ${err.message}`);
      throw err;
    }
    console.log('ℹ️  MongoDB URI is not configured yet. Server is running without active database connection.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isInMemory = false;
    lastConnectionError = null;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    lastConnectionError = error;
    const diag = categorizeMongoError(error);
    console.error(`❌ MongoDB Connection Error [${diag.category}]: ${diag.title}`);
    console.error(`👉 Solution: ${diag.suggestion}`);

    // In production, NEVER fall back to in-memory database
    if (isProduction) {
      console.error('❌ Production database connection failed. Aborting startup without fallback.');
      throw error;
    }

    // In local development, automatic fallback is disabled by default
    if (process.env.ALLOW_DEV_MEMORY_FALLBACK === 'true') {
      console.warn('⚠️  [DEV ONLY] Falling back to in-memory MongoDB because ALLOW_DEV_MEMORY_FALLBACK is enabled...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        const conn = await mongoose.connect(memUri);
        isInMemory = true;
        console.log(`✅ In-Memory Fallback MongoDB Connected: ${conn.connection.host}`);
        await seedSampleJobs();
        return conn;
      } catch (fallbackErr) {
        console.error('Fallback in-memory MongoDB error:', fallbackErr.message);
        throw fallbackErr;
      }
    }

    console.error('👉 To use an in-memory database for local testing without Atlas, set USE_MEMORY_DB=true in backend/.env');
    throw error;
  }
};

/**
 * Returns the current Mongoose connection status and diagnostics
 */
export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;
  const status = states[stateCode] || 'unknown';
  const isConfigured = Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '');

  const diag = lastConnectionError ? categorizeMongoError(lastConnectionError) : null;

  return {
    stateCode,
    status,
    isConfigured,
    isInMemory,
    isPersistent: isConnected && !isInMemory,
    databaseType: isInMemory ? 'in-memory' : (isConnected ? 'persistent' : 'none'),
    host: isConnected ? mongoose.connection.host : null,
    databaseName: isConnected ? mongoose.connection.name : null,
    errorCategory: !isConnected || isInMemory ? (diag ? diag.category : null) : null,
    troubleshooting: !isConnected || isInMemory ? (diag ? diag.suggestion : null) : null,
  };
};

// Mongoose lifecycle events
mongoose.connection.on('connected', () => {
  lastConnectionError = null;
});

mongoose.connection.on('error', (err) => {
  lastConnectionError = err;
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected.');
  isInMemory = false;
});

export default connectDB;
