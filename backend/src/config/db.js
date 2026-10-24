import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * Only attempts connection if a valid MONGO_URI is supplied in the environment.
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.trim() === '') {
    console.log('ℹ️  MongoDB URI is not configured yet. Server is running without active database connection.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Do not crash the entire server immediately during startup in development
  }
};

/**
 * Returns the current Mongoose connection status
 */
export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    status: states[stateCode] || 'unknown',
    isConfigured: Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim() !== ''),
  };
};
