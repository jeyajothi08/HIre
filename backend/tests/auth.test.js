import assert from 'node:assert/strict';
import { setupTestEnvironment } from './testHarness.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

// Unique email generator to avoid collision across repeated test runs
const timestamp = Date.now();
const testJobseekerEmail = `test_seeker_${timestamp}@hirehub.local`;
const testEmployerAEmail = `test_employer_a_${timestamp}@hirehub.local`;
const testEmployerBEmail = `test_employer_b_${timestamp}@hirehub.local`;
const testPassword = 'SecurePassword123!';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body, headers: res.headers, setCookie };
}

async function runAuthTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 5 Auth & Authorization Test Suite against ${BASE_URL}...`);

  let jobseekerToken = null;
  let employerAToken = null;
  let employerBToken = null;
  let employerAJobId = null;

  try {
    // 1. Validation: Registration with short password
    console.log('\n▶ Test 1: POST /api/v1/auth/register (Short password)');
    const regShortPw = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Short',
        email: 'alice_short@hirehub.local',
        password: '123',
        role: 'jobseeker',
      }),
    });
    assert.equal(regShortPw.status, 400);
    assert.equal(regShortPw.body.success, false);
    assert.match(regShortPw.body.message, /at least 6 characters/i);
    console.log('  ✅ Rejected short password with 400 Bad Request');

    // 2. Register a Jobseeker
    console.log('\n▶ Test 2: POST /api/v1/auth/register (Valid Jobseeker)');
    const regSeeker = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Jobseeker',
        email: testJobseekerEmail,
        password: testPassword,
        role: 'jobseeker',
      }),
    });
    assert.equal(regSeeker.status, 201);
    assert.equal(regSeeker.body.success, true);
    assert.equal(regSeeker.body.data.role, 'jobseeker');
    assert.equal(regSeeker.body.data.email, testJobseekerEmail.toLowerCase());
    assert.ok(regSeeker.body.token, 'Response must include JWT token');
    assert.equal(regSeeker.body.data.password, undefined, 'Password hash must never be exposed');
    assert.ok(regSeeker.setCookie, 'Must set authentication cookie');
    assert.ok(regSeeker.setCookie.includes('HttpOnly'), 'Cookie must have HttpOnly flag');
    jobseekerToken = regSeeker.body.token;
    console.log('  ✅ Jobseeker registered with 201 Created and HttpOnly cookie');

    // 3. Prevent duplicate email registration
    console.log('\n▶ Test 3: POST /api/v1/auth/register (Duplicate email)');
    const regDup = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Duplicate',
        email: testJobseekerEmail,
        password: testPassword,
        role: 'jobseeker',
      }),
    });
    assert.equal(regDup.status, 400);
    assert.equal(regDup.body.success, false);
    assert.match(regDup.body.message, /already exists/i);
    console.log('  ✅ Duplicate email rejected with 400 Bad Request');

    // 4. Login with wrong password
    console.log('\n▶ Test 4: POST /api/v1/auth/login (Wrong password)');
    const badPwLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testJobseekerEmail,
        password: 'IncorrectPassword999!',
      }),
    });
    assert.equal(badPwLogin.status, 401);
    assert.equal(badPwLogin.body.success, false);
    assert.equal(badPwLogin.body.message, 'Invalid email or password');
    console.log('  ✅ Rejected wrong password with 401 Unauthorized');

    // 5. Login with non-existent email
    console.log('\n▶ Test 5: POST /api/v1/auth/login (Non-existent email)');
    const nonExistentLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ghost_user_999@hirehub.local',
        password: testPassword,
      }),
    });
    assert.equal(nonExistentLogin.status, 401);
    assert.equal(nonExistentLogin.body.message, 'Invalid email or password');
    console.log('  ✅ Rejected non-existent user with generic 401 Unauthorized');

    // 6. Login with correct credentials
    console.log('\n▶ Test 6: POST /api/v1/auth/login (Valid credentials)');
    const validLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testJobseekerEmail,
        password: testPassword,
      }),
    });
    assert.equal(validLogin.status, 200);
    assert.equal(validLogin.body.success, true);
    assert.equal(validLogin.body.data.email, testJobseekerEmail.toLowerCase());
    console.log('  ✅ Successful login returned 200 OK');

    // 7. GET /api/v1/auth/me without token
    console.log('\n▶ Test 7: GET /api/v1/auth/me (No token)');
    const meNoToken = await request('/api/v1/auth/me');
    assert.equal(meNoToken.status, 401);
    assert.equal(meNoToken.body.success, false);
    console.log('  ✅ Rejected unauthenticated /me with 401 Unauthorized');

    // 8. GET /api/v1/auth/me with invalid token
    console.log('\n▶ Test 8: GET /api/v1/auth/me (Tampered token)');
    const meBadToken = await request('/api/v1/auth/me', {
      headers: { Authorization: 'Bearer this.is.a.fake.jwt.token' },
    });
    assert.equal(meBadToken.status, 401);
    console.log('  ✅ Rejected fake token with 401 Unauthorized');

    // 9. GET /api/v1/auth/me with valid Bearer token
    console.log('\n▶ Test 9: GET /api/v1/auth/me (Valid Bearer token)');
    const meValid = await request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${jobseekerToken}` },
    });
    assert.equal(meValid.status, 200);
    assert.equal(meValid.body.data.email, testJobseekerEmail.toLowerCase());
    console.log('  ✅ Retrieved current user profile with 200 OK');

    // 10. POST /api/v1/jobs without token (Should be 401)
    console.log('\n▶ Test 10: POST /api/v1/jobs (Unauthenticated write)');
    const jobNoAuth = await request('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Unauthorized Engineer',
        company: 'Shadow Corp',
        location: 'Remote',
        description: 'Should never be created without authentication.',
      }),
    });
    assert.equal(jobNoAuth.status, 401);
    console.log('  ✅ Unauthenticated job creation blocked with 401 Unauthorized');

    // 11. POST /api/v1/jobs with Jobseeker role (Should be 403 Forbidden)
    console.log('\n▶ Test 11: POST /api/v1/jobs (Jobseeker attempting to create job)');
    const jobSeekerCreate = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jobseekerToken}` },
      body: JSON.stringify({
        title: 'Unauthorized Engineer',
        company: 'Shadow Corp',
        location: 'Remote',
        description: 'Jobseeker should not be allowed to post jobs.',
      }),
    });
    assert.equal(jobSeekerCreate.status, 403);
    assert.match(jobSeekerCreate.body.message, /Forbidden/i);
    console.log('  ✅ Jobseeker job creation blocked with 403 Forbidden');

    // 12. Register Employer A
    console.log('\n▶ Test 12: POST /api/v1/auth/register (Employer A)');
    const regEmployerA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bob Employer A',
        email: testEmployerAEmail,
        password: testPassword,
        role: 'employer',
      }),
    });
    assert.equal(regEmployerA.status, 201);
    assert.equal(regEmployerA.body.data.role, 'employer');
    employerAToken = regEmployerA.body.token;
    console.log('  ✅ Employer A registered successfully');

    // 13. Employer A creates a job
    console.log('\n▶ Test 13: POST /api/v1/jobs (Employer A authorized creation)');
    const createEmployerAJob = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({
        title: 'Staff Security Engineer (Auth Phase 5)',
        company: 'HireHub Employer A Labs',
        location: 'Remote (US)',
        employmentType: 'Full-time',
        workplaceType: 'Remote',
        description: 'Comprehensive cybersecurity leadership role managing enterprise Zero Trust architectures.',
        skills: ['JWT', 'OAuth2', 'Node.js', 'MongoDB', 'Penetration Testing'],
        salaryMin: 160000,
        salaryMax: 200000,
      }),
    });
    assert.equal(createEmployerAJob.status, 201);
    assert.equal(createEmployerAJob.body.success, true);
    employerAJobId = createEmployerAJob.body.data._id;
    console.log('  ✅ Employer A created job with 201 Created. ID:', employerAJobId);

    // 14. Register Employer B
    console.log('\n▶ Test 14: POST /api/v1/auth/register (Employer B)');
    const regEmployerB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Charlie Employer B',
        email: testEmployerBEmail,
        password: testPassword,
        role: 'employer',
      }),
    });
    assert.equal(regEmployerB.status, 201);
    employerBToken = regEmployerB.body.token;
    console.log('  ✅ Employer B registered successfully');

    // 15. Employer B tries to update Employer A's job (Should be 403 Forbidden)
    console.log("\n▶ Test 15: PATCH /api/v1/jobs/:id (Employer B modifying Employer A's job)");
    const patchUnauthorized = await request(`/api/v1/jobs/${employerAJobId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerBToken}` },
      body: JSON.stringify({
        title: 'Malicious Hijacked Job Title',
      }),
    });
    assert.equal(patchUnauthorized.status, 403);
    assert.match(patchUnauthorized.body.message, /Forbidden.*permission/i);
    console.log("  ✅ Employer B modification blocked with 403 Forbidden");

    // 16. Employer B tries to delete Employer A's job (Should be 403 Forbidden)
    console.log("\n▶ Test 16: DELETE /api/v1/jobs/:id (Employer B deleting Employer A's job)");
    const deleteUnauthorized = await request(`/api/v1/jobs/${employerAJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(deleteUnauthorized.status, 403);
    assert.match(deleteUnauthorized.body.message, /Forbidden.*permission/i);
    console.log("  ✅ Employer B deletion blocked with 403 Forbidden");

    // 17. Employer A updates their own job (Should be 200 OK)
    console.log("\n▶ Test 17: PATCH /api/v1/jobs/:id (Employer A updating their own job)");
    const patchAuthorized = await request(`/api/v1/jobs/${employerAJobId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({
        title: 'Staff Security Engineer (Updated Title)',
        salaryMax: 215000,
      }),
    });
    assert.equal(patchAuthorized.status, 200);
    assert.equal(patchAuthorized.body.data.title, 'Staff Security Engineer (Updated Title)');
    assert.equal(patchAuthorized.body.data.salaryMax, 215000);
    console.log('  ✅ Employer A successfully updated own job with 200 OK');

    // 18. Employer A deletes their own job (Should be 200 OK)
    console.log("\n▶ Test 18: DELETE /api/v1/jobs/:id (Employer A deleting their own job)");
    const deleteAuthorized = await request(`/api/v1/jobs/${employerAJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(deleteAuthorized.status, 200);
    assert.equal(deleteAuthorized.body.message, 'Job deleted successfully');
    console.log('  ✅ Employer A successfully deleted own job with 200 OK');

    // 19. Logout endpoint
    console.log('\n▶ Test 19: POST /api/v1/auth/logout');
    const logoutRes = await request('/api/v1/auth/logout', { method: 'POST' });
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
    console.log('  ✅ Logout returned 200 and cleared cookie');

    console.log('\n════════════════════════════════════════════════════════');
    console.log('🎉 All 19 Authentication & Authorization tests passed!');
    console.log('════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Auth test suite failed:', err);
    if (employerAJobId) {
      try {
        await request(`/api/v1/jobs/${employerAJobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${employerAToken}` },
        });
      } catch (_) {}
    }
    process.exit(1);
  } finally {
    await testEnv.teardown();
  }
}

runAuthTests();
