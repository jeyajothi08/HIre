import assert from 'node:assert/strict';
import { setupTestEnvironment } from './testHarness.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

async function request(path, options = {}) {
  const { headers = {}, ...rest } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body };
}

async function runTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 3/5 Jobs API Test Suite against ${BASE_URL}...`);
  let createdJobId = null;
  let employerToken = null;

  try {
    // 1. Health check
    console.log('\n▶ Test 1: GET /api/v1/health');
    const health = await request('/api/v1/health');
    assert.equal(health.status, 200, 'Health endpoint should return 200');
    assert.equal(health.body.success, true);
    assert.equal(health.body.database.status, 'connected', 'Database must be connected');
    console.log('  ✅ Health check passed. DB status:', health.body.database.status);

    // 2. Root API welcome check
    console.log('\n▶ Test 2: GET /');
    const root = await request('/');
    assert.equal(root.status, 200);
    assert.equal(root.body.endpoints.jobs, '/api/v1/jobs');
    console.log('  ✅ Root route lists /api/v1/jobs');

    // Setup: Register an employer for authorized job write tests
    const empEmail = `job_test_employer_${Date.now()}@hirehub.local`;
    const regEmp = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jobs Test Employer',
        email: empEmail,
        password: 'Password123!',
        role: 'employer',
      }),
    });
    assert.equal(regEmp.status, 201);
    employerToken = regEmp.body.token;

    // 3. Validation: POST missing required fields
    console.log('\n▶ Test 3: POST /api/v1/jobs (Missing required fields)');
    const postMissing = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify({ title: 'Engineer' }),
    });
    if (postMissing.status !== 400) {
      console.error('postMissing unexpected response:', postMissing);
    }
    assert.equal(postMissing.status, 400);
    assert.equal(postMissing.body.success, false);
    assert.match(postMissing.body.message, /Missing required field/);
    console.log('  ✅ Missing fields correctly rejected with 400 Bad Request');

    // 4. Validation: POST with invalid salary (min > max)
    console.log('\n▶ Test 4: POST /api/v1/jobs (Invalid salary range: min > max)');
    const postBadSalary = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify({
        title: 'Full Stack Developer',
        company: 'Acme Corp',
        location: 'Remote',
        description: 'Comprehensive role building modern web apps with React and Node.js.',
        salaryMin: 150000,
        salaryMax: 100000,
      }),
    });
    assert.equal(postBadSalary.status, 400);
    assert.equal(postBadSalary.body.success, false);
    console.log('  ✅ Invalid salary rejected with 400 Bad Request');

    // 5. Create a valid job
    console.log('\n▶ Test 5: POST /api/v1/jobs (Valid job creation)');
    const postValid = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify({
        title: 'Senior MERN Stack Engineer',
        company: 'HireHub Tech Labs',
        location: 'San Francisco, CA',
        employmentType: 'Full-time',
        workplaceType: 'Hybrid',
        description: 'Lead engineering for scalable job portal services using Node.js, Express, and MongoDB Atlas.',
        skills: ['React', 'Node.js', 'MongoDB', 'Express', 'TailwindCSS'],
        salaryMin: 140000,
        salaryMax: 180000,
      }),
    });
    assert.equal(postValid.status, 201);
    assert.equal(postValid.body.success, true);
    assert.ok(postValid.body.data._id, 'Created job must have an _id');
    assert.equal(postValid.body.data.title, 'Senior MERN Stack Engineer');
    createdJobId = postValid.body.data._id;
    console.log('  ✅ Job created with 201 Created. ID:', createdJobId);

    // 6. List jobs and filter by keyword (Public read)
    console.log('\n▶ Test 6: GET /api/v1/jobs (List and filter)');
    const listRes = await request('/api/v1/jobs?q=MERN');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.success, true);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length > 0);
    console.log(`  ✅ Jobs listed. Found ${listRes.body.count} matching job(s)`);

    // 7. Get job by ID (Public read)
    console.log('\n▶ Test 7: GET /api/v1/jobs/:id');
    const getSingle = await request(`/api/v1/jobs/${createdJobId}`);
    assert.equal(getSingle.status, 200);
    assert.equal(getSingle.body.success, true);
    assert.equal(getSingle.body.data._id, createdJobId);
    console.log('  ✅ Retrieved job by ID matches created job');

    // 8. Get job by malformed ID (400 Bad Request)
    console.log('\n▶ Test 8: GET /api/v1/jobs/invalid-id (Malformed ID format)');
    const badIdRes = await request('/api/v1/jobs/not-a-valid-object-id');
    assert.equal(badIdRes.status, 400);
    assert.equal(badIdRes.body.success, false);
    assert.equal(badIdRes.body.message, 'Invalid Job ID format');
    console.log('  ✅ Malformed ID correctly rejected with 400 Bad Request');

    // 9. Get job by non-existent valid ObjectId (404 Not Found)
    console.log('\n▶ Test 9: GET /api/v1/jobs/507f1f77bcf86cd799439011 (Non-existent ID)');
    const notFoundRes = await request('/api/v1/jobs/507f1f77bcf86cd799439011');
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.body.success, false);
    assert.equal(notFoundRes.body.message, 'Job not found');
    console.log('  ✅ Non-existent ID returns 404 Not Found');

    // 10. PATCH /api/v1/jobs/:id (Update job with employer token)
    console.log('\n▶ Test 10: PATCH /api/v1/jobs/:id (Update fields)');
    const patchRes = await request(`/api/v1/jobs/${createdJobId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerToken}` },
      body: JSON.stringify({
        title: 'Lead Full Stack Architect',
        salaryMax: 195000,
        workplaceType: 'Remote',
      }),
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.success, true);
    assert.equal(patchRes.body.data.title, 'Lead Full Stack Architect');
    assert.equal(patchRes.body.data.salaryMax, 195000);
    assert.equal(patchRes.body.data.workplaceType, 'Remote');
    console.log('  ✅ Job updated successfully with 200 OK');

    // 11. DELETE /api/v1/jobs/:id (with employer token)
    console.log('\n▶ Test 11: DELETE /api/v1/jobs/:id');
    const deleteRes = await request(`/api/v1/jobs/${createdJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employerToken}` },
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
    assert.equal(deleteRes.body.message, 'Job deleted successfully');
    console.log('  ✅ Job deleted successfully with 200 OK');

    // 12. Verify deleted job is gone (404)
    console.log('\n▶ Test 12: GET /api/v1/jobs/:id (Post-delete 404 check)');
    const postDeleteGet = await request(`/api/v1/jobs/${createdJobId}`);
    assert.equal(postDeleteGet.status, 404);
    assert.equal(postDeleteGet.body.message, 'Job not found');
    console.log('  ✅ Post-delete check confirmed 404 Not Found');

    console.log('\n════════════════════════════════════════════════');
    console.log('🎉 All 12 Job API tests passed with flying colors!');
    console.log('════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    if (createdJobId && employerToken) {
      try {
        await request(`/api/v1/jobs/${createdJobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${employerToken}` },
        });
      } catch (_) {}
    }
    process.exit(1);
  } finally {
    await testEnv.teardown();
  }
}

runTests();
