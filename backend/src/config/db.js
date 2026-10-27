import './env.js';
import mongoose from 'mongoose';

let lastConnectionError = null;

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
      suggestion: 'In MongoDB Atlas dashboard, go to "Network Access" -> click "Add IP Address" -> choose "Allow Access from Anywhere" (0.0.0.0/0) or add your current IP address.',
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
    suggestion: 'Verify your MongoDB Atlas cluster is running and your Mac internet connection is active.',
  };
};

/**
 * Connect to MongoDB database
 * Uses a 5-second serverSelectionTimeoutMS for fast feedback during local development.
 */
export const connectDB = async () => {
  if (process.env.USE_MEMORY_DB === 'true') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`✅ In-Memory MongoDB Connected for local session: ${conn.connection.host}`);
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
      return;
    } catch (err) {
      console.error('Failed to initialize in-memory DB:', err);
    }
  }

  const uri = process.env.MONGO_URI;

  if (!uri || uri.trim() === '') {
    console.log('ℹ️  MongoDB URI is not configured yet. Server is running without active database connection.');
    return;
  }

  lastConnectionError = null;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    lastConnectionError = error;
    const diag = categorizeMongoError(error);
    console.error(`❌ MongoDB Connection Error [${diag.category}]: ${diag.title}`);
    console.error(`👉 Solution: ${diag.suggestion}`);

    console.log('🔄 Automatically falling back to in-memory MongoDB so HireHub is immediately usable locally...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      lastConnectionError = null;
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
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
    } catch (fallbackErr) {
      console.error('Fallback in-memory MongoDB error:', fallbackErr.message);
    }
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
  const status = states[stateCode] || 'unknown';
  const isConfigured = Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '');

  const diag = lastConnectionError ? categorizeMongoError(lastConnectionError) : null;

  return {
    stateCode,
    status,
    isConfigured,
    host: status === 'connected' ? mongoose.connection.host : null,
    databaseName: status === 'connected' ? mongoose.connection.name : null,
    errorCategory: status === 'connected' ? null : (diag ? diag.category : null),
    troubleshooting: status === 'connected' ? null : (diag ? diag.suggestion : null),
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
});

export default connectDB;
