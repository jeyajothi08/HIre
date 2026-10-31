import assert from 'node:assert/strict';
import { getAuthCookieOptions } from '../src/controllers/authController.js';

console.log('🧪 Starting Cookie Options Automated Test Suite...');

const originalEnv = process.env.NODE_ENV;

try {
  // Test 1: Production cookie options (Unified Same-Origin Architecture)
  console.log('\n▶ Test 1: Production Cookie Options (Unified Same-Origin Architecture)');
  process.env.NODE_ENV = 'production';
  const prodOpts = getAuthCookieOptions();
  assert.equal(prodOpts.httpOnly, true, 'httpOnly must be true in production');
  assert.equal(prodOpts.secure, true, 'secure must be true in production');
  assert.equal(prodOpts.sameSite, 'lax', 'sameSite must be "lax" in production for same-origin architecture (Safari ITP immune)');
  assert.equal(prodOpts.path, '/', 'path must be "/" in production');
  assert.equal(prodOpts.domain, undefined, 'domain must be undefined (binds strictly to current origin)');
  console.log('  ✅ Production cookie options: httpOnly=true, secure=true, sameSite="lax", path="/"');

  // Test 2: Development cookie options
  console.log('\n▶ Test 2: Development Cookie Options');
  process.env.NODE_ENV = 'development';
  const devOpts = getAuthCookieOptions();
  assert.equal(devOpts.httpOnly, true, 'httpOnly must be true in development');
  assert.equal(devOpts.secure, false, 'secure must be false in development for local HTTP testing');
  assert.equal(devOpts.sameSite, 'lax', 'sameSite must be "lax" in development');
  assert.equal(devOpts.path, '/', 'path must be "/" in development');
  assert.equal(devOpts.domain, undefined, 'domain must be undefined in development');
  console.log('  ✅ Development cookie options: httpOnly=true, secure=false, sameSite="lax", path="/"');

  // Test 3: Logout cookie parity in production
  console.log('\n▶ Test 3: Logout Cookie Option Parity (Production)');
  process.env.NODE_ENV = 'production';
  const logoutProd = getAuthCookieOptions(new Date(0));
  assert.equal(logoutProd.expires.getTime(), 0, 'expires must be epoch 0');
  assert.equal(logoutProd.httpOnly, true, 'logout httpOnly must be true');
  assert.equal(logoutProd.secure, true, 'logout secure must be true');
  assert.equal(logoutProd.sameSite, 'lax', 'logout sameSite must be "lax"');
  assert.equal(logoutProd.path, '/', 'logout path must be "/"');
  assert.equal(logoutProd.domain, undefined, 'logout domain must be undefined');
  console.log('  ✅ Logout options match production login/registration');

  // Test 4: Logout cookie parity in development
  console.log('\n▶ Test 4: Logout Cookie Option Parity (Development)');
  process.env.NODE_ENV = 'development';
  const logoutDev = getAuthCookieOptions(new Date(0));
  assert.equal(logoutDev.expires.getTime(), 0, 'expires must be epoch 0');
  assert.equal(logoutDev.httpOnly, true, 'logout httpOnly must be true');
  assert.equal(logoutDev.secure, false, 'logout secure must be false');
  assert.equal(logoutDev.sameSite, 'lax', 'logout sameSite must be "lax"');
  assert.equal(logoutDev.path, '/', 'logout path must be "/"');
  console.log('  ✅ Logout options match development login/registration');

  console.log('\n════════════════════════════════════════════════════════');
  console.log('🎉 All Cookie Options tests passed successfully!');
  console.log('════════════════════════════════════════════════════════\n');
} finally {
  process.env.NODE_ENV = originalEnv;
}

