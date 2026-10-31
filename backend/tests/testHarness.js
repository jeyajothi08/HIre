import mongoose from 'mongoose';
import app from '../src/app.js';
import { getDBStatus, setIsInMemory } from '../src/config/db.js';

let activeServer = null;
let activeMongod = null;

/**
 * Ensures an active HTTP server and connected MongoDB are available for testing.
 * Strictly guarantees tests run on an isolated in-memory database and NEVER touch
 * a live persistent Atlas/production database.
 */
export async function setupTestEnvironment() {
  const defaultPort = process.env.PORT || 5001;
  const candidateUrl = process.env.API_URL || `http://localhost:${defaultPort}`;

  // Check if live server is already running and connected
  try {
    const res = await fetch(`${candidateUrl}/api/v1/health`, {
      signal: AbortSignal.timeout(1200),
    });
    if (res.ok) {
      const data = await res.json();
      // Strictly verify that the server is running on in-memory database and NOT persistent Atlas/production
      if (data.database && data.database.status === 'connected' && data.database.isInMemory === true && !data.database.isPersistent) {
        process.env.API_URL = candidateUrl;
        return {
          baseUrl: candidateUrl,
          isEphemeral: false,
          teardown: async () => {},
        };
      }
    }
  } catch (_) {
    // Live server not running or not reachable; proceed to spin up ephemeral test harness
  }

  // Live database not connected or is connected to persistent storage;
  // Launch isolated in-memory MongoDB server
  const dbStatus = getDBStatus();
  if (dbStatus.status !== 'connected' || !dbStatus.isInMemory) {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    activeMongod = await MongoMemoryServer.create();
    const mongoUri = activeMongod.getUri();
    await mongoose.connect(mongoUri);
    setIsInMemory(true);
    console.log(`  [Test Harness] Isolated in-memory MongoDB connected: ${mongoUri}`);
  }

  // Start ephemeral Express HTTP server on free port
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const ephemeralBaseUrl = `http://localhost:${port}`;
  process.env.API_URL = ephemeralBaseUrl;
  activeServer = server;

  console.log(`  [Test Harness] Ephemeral test server running at: ${ephemeralBaseUrl}`);

  return {
    baseUrl: ephemeralBaseUrl,
    isEphemeral: true,
    teardown: async () => {
      if (activeServer) {
        await new Promise((resolve) => activeServer.close(resolve));
        activeServer = null;
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      if (activeMongod) {
        await activeMongod.stop();
        activeMongod = null;
      }
      setIsInMemory(false);
    },
  };
}
