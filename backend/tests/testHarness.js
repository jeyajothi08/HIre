import mongoose from 'mongoose';
import app from '../src/app.js';
import { getDBStatus } from '../src/config/db.js';

let activeServer = null;
let activeMongod = null;

/**
 * Ensures an active HTTP server and connected MongoDB are available for testing.
 * If http://localhost:5001 is already running with a connected database, uses it.
 * Otherwise, spins up an ephemeral HTTP server on a random free port and connects
 * to an in-memory MongoDB instance (MongoMemoryServer).
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
      if (data.database && data.database.status === 'connected') {
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

  // Live database not connected; launch in-memory MongoDB server
  const dbStatus = getDBStatus();
  if (dbStatus.status !== 'connected') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    activeMongod = await MongoMemoryServer.create();
    const mongoUri = activeMongod.getUri();
    await mongoose.connect(mongoUri);
    console.log(`  [Test Harness] In-memory MongoDB connected: ${mongoUri}`);
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
    },
  };
}
