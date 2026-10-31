import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import app from '../src/app.js';
import { getAuthCookieOptions } from '../src/controllers/authController.js';

console.log('🧪 Starting Unified Same-Origin Serving Automated Test Suite...');

function testRequest(method, url, headers = {}) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost', ...headers };

    const res = new http.ServerResponse(req);
    let body = '';

    res.sendFile = (filepath) => {
      resolve({
        statusCode: res.statusCode || 200,
        filepath,
        headers: res.getHeaders(),
      });
    };

    res.end = (chunk) => {
      if (chunk) body += chunk;
      let json = null;
      try {
        json = JSON.parse(body);
      } catch (_) {}
      resolve({
        statusCode: res.statusCode || 200,
        body,
        json,
        headers: res.getHeaders(),
      });
    };

    res.write = (chunk) => {
      if (chunk) body += chunk;
      return true;
    };

    app.handle(req, res);
  });
}

async function runUnifiedServingTests() {
  // Test 1: Browser visiting root (/) receives index.html
  console.log('\n▶ Test 1: GET / (Browser HTML Request)');
  const rootHtml = await testRequest('GET', '/', {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });
  assert.equal(rootHtml.statusCode, 200, 'Root HTML request should return 200 OK');
  assert.ok(rootHtml.filepath && rootHtml.filepath.endsWith('index.html'), 'Root HTML should serve index.html');
  console.log('  ✅ Root HTML navigation serves frontend index.html');

  // Test 2: API client visiting root (/) receives API welcome JSON
  console.log('\n▶ Test 2: GET / (API Client JSON Request)');
  const rootJson = await testRequest('GET', '/', {
    accept: 'application/json',
  });
  assert.equal(rootJson.statusCode, 200, 'Root JSON request should return 200 OK');
  assert.equal(rootJson.json?.message, 'Welcome to HireHub API');
  assert.equal(rootJson.json?.endpoints?.jobs, '/api/v1/jobs');
  console.log('  ✅ Root API client request receives welcome JSON object');

  // Test 3: SPA client-side fallback routes (/jobs, /login, /profile)
  console.log('\n▶ Test 3: Frontend SPA Fallback Routes (/jobs, /login, /profile)');
  for (const route of ['/jobs', '/login', '/profile', '/dashboard/settings']) {
    const spaRes = await testRequest('GET', route, {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });
    assert.equal(spaRes.statusCode, 200, `SPA route ${route} should return 200 OK`);
    assert.ok(spaRes.filepath && spaRes.filepath.endsWith('index.html'), `${route} should fall back to index.html`);
  }
  console.log('  ✅ All frontend client-side routes safely fall back to index.html');

  // Test 4: Static assets serving (CSS & JS)
  console.log('\n▶ Test 4: Static Asset Serving (CSS & JS bundles)');
  const cssRes = await testRequest('GET', '/assets/index-DWvjliLw.css');
  assert.equal(cssRes.statusCode, 200, 'CSS asset should return 200 OK');
  assert.match(String(cssRes.headers['content-type']), /text\/css/i);

  const jsRes = await testRequest('GET', '/assets/index-Cs9tRR1a.js');
  assert.equal(jsRes.statusCode, 200, 'JS asset should return 200 OK');
  assert.match(String(jsRes.headers['content-type']), /javascript/i);
  console.log('  ✅ Static CSS and JavaScript bundles served with valid MIME types and 200 OK');

  // Test 5: API routes reach API handlers
  console.log('\n▶ Test 5: API Route Dispatch (/api/v1/health)');
  const healthRes = await testRequest('GET', '/api/v1/health');
  assert.equal(healthRes.statusCode, 200, 'Health endpoint should return 200 OK');
  assert.equal(healthRes.json?.service, 'HireHub API Server');
  console.log('  ✅ /api/v1/health correctly handled by Express API router');

  // Test 6: Unknown API routes return JSON 404, NEVER index.html
  console.log('\n▶ Test 6: Unknown API Route Protection (Must return JSON 404, never index.html)');
  const unknownApiGet = await testRequest('GET', '/api/v1/unknown-endpoint');
  assert.equal(unknownApiGet.statusCode, 404, 'Unknown API GET should return 404');
  assert.equal(unknownApiGet.json?.success, false);
  assert.match(unknownApiGet.json?.message, /Resource not found/i);
  assert.equal(unknownApiGet.filepath, undefined, 'Unknown API route must NEVER serve index.html');

  const unknownApiPost = await testRequest('POST', '/api/random-action');
  assert.equal(unknownApiPost.statusCode, 404, 'Unknown API POST should return 404');
  assert.equal(unknownApiPost.json?.success, false);
  assert.match(unknownApiPost.json?.message, /Resource not found/i);
  assert.equal(unknownApiPost.filepath, undefined, 'Unknown API POST must NEVER serve index.html');
  console.log('  ✅ Unknown API endpoints return standardized JSON 404 and never leak index.html');

  // Test 7: Unified same-origin cookie options validation
  console.log('\n▶ Test 7: Unified Same-Origin Cookie Options (SameSite=Lax)');
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const prodOpts = getAuthCookieOptions();
    assert.equal(prodOpts.httpOnly, true);
    assert.equal(prodOpts.secure, true);
    assert.equal(prodOpts.sameSite, 'lax', 'Production cookie in same-origin setup must be SameSite=Lax (Safari ITP immune)');
    assert.equal(prodOpts.path, '/');
    assert.equal(prodOpts.domain, undefined, 'Domain must be undefined to bind strictly to current host');

    process.env.NODE_ENV = 'development';
    const devOpts = getAuthCookieOptions();
    assert.equal(devOpts.httpOnly, true);
    assert.equal(devOpts.secure, false);
    assert.equal(devOpts.sameSite, 'lax');
    assert.equal(devOpts.path, '/');
    assert.equal(devOpts.domain, undefined);
    console.log('  ✅ Cookie options: httpOnly=true, secure=true (prod), sameSite="lax", path="/", domain=undefined');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('🎉 All 7 Unified Same-Origin Serving tests passed successfully!');
  console.log('════════════════════════════════════════════════════════\n');
}

runUnifiedServingTests();

