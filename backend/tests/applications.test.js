import assert from 'node:assert/strict';
import { setupTestEnvironment } from './testHarness.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

const timestamp = Date.now();
const seekerAEmail = `seeker_a_${timestamp}@hirehub.local`;
const seekerBEmail = `seeker_b_${timestamp}@hirehub.local`;
const employerAEmail = `emp_a_${timestamp}@hirehub.local`;
const employerBEmail = `emp_b_${timestamp}@hirehub.local`;
const password = 'SecurePassword123!';

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
  return { status: res.status, body, headers: res.headers };
}

async function runApplicationTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 6 Application System Test Suite against ${BASE_URL}...`);

  let seekerAToken = null;
  let seekerBToken = null;
  let employerAToken = null;
  let employerBToken = null;
  let employerAJobId = null;
  let createdAppId = null;

  try {
    // 1. Setup accounts
    console.log('\n▶ Setup: Registering test users (Jobseekers A & B, Employers A & B)...');
    
    // Register Seeker A
    const regSeekerA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Seeker Alice', email: seekerAEmail, password, role: 'jobseeker' }),
    });
    assert.equal(regSeekerA.status, 201);
    seekerAToken = regSeekerA.body.token;

    // Register Seeker B
    const regSeekerB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Seeker Bob', email: seekerBEmail, password, role: 'jobseeker' }),
    });
    assert.equal(regSeekerB.status, 201);
    seekerBToken = regSeekerB.body.token;

    // Register Employer A
    const regEmpA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Employer Acme Corp', email: employerAEmail, password, role: 'employer' }),
    });
    assert.equal(regEmpA.status, 201);
    employerAToken = regEmpA.body.token;

    // Register Employer B
    const regEmpB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Employer Beta Labs', email: employerBEmail, password, role: 'employer' }),
    });
    assert.equal(regEmpB.status, 201);
    employerBToken = regEmpB.body.token;

    // Employer A creates a job
    const createJobRes = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({
        title: 'Principal Distributed Systems Engineer',
        company: 'Acme Cloud Inc',
        location: 'Remote',
        employmentType: 'Full-time',
        workplaceType: 'Remote',
        description: 'Design and implement high-throughput event sourcing pipelines.',
        skills: ['Node.js', 'Kafka', 'MongoDB', 'Go'],
        salaryMin: 180000,
        salaryMax: 220000,
      }),
    });
    assert.equal(createJobRes.status, 201);
    employerAJobId = createJobRes.body.data._id;
    console.log('  ✅ Accounts and test job created. Job ID:', employerAJobId);

    // 2. Unauthenticated application rejected
    console.log('\n▶ Test 1: POST /api/v1/applications (Unauthenticated)');
    const unauthApp = await request('/api/v1/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId: employerAJobId, coverLetter: 'Hello' }),
    });
    assert.equal(unauthApp.status, 401);
    console.log('  ✅ Unauthenticated application rejected with 401 Unauthorized');

    // 3. Employer blocked from applying to jobs
    console.log('\n▶ Test 2: POST /api/v1/applications (Employer role blocked)');
    const empApply = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerBToken}` },
      body: JSON.stringify({ jobId: employerAJobId, coverLetter: 'Employers should not apply.' }),
    });
    assert.equal(empApply.status, 403);
    assert.match(empApply.body.message, /Forbidden.*jobseeker/i);
    console.log('  ✅ Employer blocked from applying with 403 Forbidden');

    // 4. Invalid job ID rejected
    console.log('\n▶ Test 3: POST /api/v1/applications (Invalid ObjectId)');
    const badIdApp = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({ jobId: 'not-a-valid-id', coverLetter: 'Test' }),
    });
    assert.equal(badIdApp.status, 400);
    assert.match(badIdApp.body.message, /Invalid Job ID format/i);
    console.log('  ✅ Invalid Job ID rejected with 400 Bad Request');

    // 5. Non-existent job rejected
    console.log('\n▶ Test 4: POST /api/v1/applications (Non-existent job)');
    const nonExistentJobApp = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({ jobId: '507f1f77bcf86cd799439011', coverLetter: 'Test' }),
    });
    assert.equal(nonExistentJobApp.status, 404);
    assert.match(nonExistentJobApp.body.message, /Job.*not found/i);
    console.log('  ✅ Non-existent job rejected with 404 Not Found');

    // 6. Successful application by Seeker A
    console.log('\n▶ Test 5: POST /api/v1/applications (Valid Jobseeker A application)');
    const validApp = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({
        jobId: employerAJobId,
        coverLetter: 'I have 8 years of experience building scalable distributed streaming systems.',
      }),
    });
    assert.equal(validApp.status, 201);
    assert.equal(validApp.body.success, true);
    assert.equal(validApp.body.data.status, 'Pending');
    assert.equal(validApp.body.data.job, employerAJobId);
    assert.ok(validApp.body.data.employer, 'Application must capture employer reference');
    createdAppId = validApp.body.data._id;
    console.log('  ✅ Seeker A applied successfully with 201 Created. Application ID:', createdAppId);

    // 7. Duplicate application rejected
    console.log('\n▶ Test 6: POST /api/v1/applications (Duplicate application rejection)');
    const dupApp = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({
        jobId: employerAJobId,
        coverLetter: 'Attempting to apply again.',
      }),
    });
    assert.equal(dupApp.status, 400);
    assert.match(dupApp.body.message, /already.*(applied|application)/i);
    console.log('  ✅ Duplicate application rejected with 400 Bad Request');

    // 8. Seeker A views own applications
    console.log('\n▶ Test 7: GET /api/v1/applications/my (Seeker A own applications)');
    const seekerAMyApps = await request('/api/v1/applications/my', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(seekerAMyApps.status, 200);
    assert.equal(seekerAMyApps.body.count, 1);
    assert.equal(seekerAMyApps.body.data[0]._id, createdAppId);
    assert.equal(seekerAMyApps.body.data[0].job.title, 'Principal Distributed Systems Engineer');
    console.log('  ✅ Seeker A retrieved their 1 submitted application with populated job info');

    // 9. Seeker B isolation check (cannot see Seeker A's applications)
    console.log('\n▶ Test 8: GET /api/v1/applications/my (Seeker B isolation check)');
    const seekerBMyApps = await request('/api/v1/applications/my', {
      headers: { Authorization: `Bearer ${seekerBToken}` },
    });
    assert.equal(seekerBMyApps.status, 200);
    assert.equal(seekerBMyApps.body.count, 0, "Seeker B must not see Seeker A's applications");
    console.log("  ✅ Seeker B isolated: sees 0 applications as expected");

    // 10. Non-owning Employer B tries to view applicants for Employer A's job (403)
    console.log('\n▶ Test 9: GET /api/v1/jobs/:jobId/applications (Non-owning Employer B blocked)');
    const empBViewApplicants = await request(`/api/v1/jobs/${employerAJobId}/applications`, {
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(empBViewApplicants.status, 403);
    assert.match(empBViewApplicants.body.message, /Forbidden.*permission/i);
    console.log('  ✅ Non-owning Employer B blocked with 403 Forbidden');

    // 11. Owning Employer A views applicants for own job (200)
    console.log('\n▶ Test 10: GET /api/v1/jobs/:jobId/applications (Owning Employer A authorized)');
    const empAViewApplicants = await request(`/api/v1/jobs/${employerAJobId}/applications`, {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empAViewApplicants.status, 200);
    assert.equal(empAViewApplicants.body.count, 1);
    assert.equal(empAViewApplicants.body.data[0].applicant.email, seekerAEmail.toLowerCase());
    assert.equal(empAViewApplicants.body.data[0].applicant.password, undefined, 'Password must never be exposed');
    console.log('  ✅ Owning Employer A retrieved applicants with sanitized candidate profile');

    // 12. Non-owning Employer B tries to update status (403)
    console.log('\n▶ Test 11: PATCH /api/v1/applications/:id/status (Non-owning Employer B blocked)');
    const empBUpdateStatus = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerBToken}` },
      body: JSON.stringify({ status: 'Shortlisted' }),
    });
    assert.equal(empBUpdateStatus.status, 403);
    assert.match(empBUpdateStatus.body.message, /Forbidden.*permission/i);
    console.log('  ✅ Non-owning Employer B blocked from status update with 403 Forbidden');

    // 13. Invalid status update rejected
    console.log('\n▶ Test 12: PATCH /api/v1/applications/:id/status (Invalid status value)');
    const badStatusUpdate = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({ status: 'SuperShortlisted' }),
    });
    assert.equal(badStatusUpdate.status, 400);
    assert.match(badStatusUpdate.body.message, /Invalid status/i);
    console.log('  ✅ Invalid status value rejected with 400 Bad Request');

    // 14. Owning Employer A updates status to 'Shortlisted' (200)
    console.log('\n▶ Test 13: PATCH /api/v1/applications/:id/status (Owning Employer A update)');
    const validStatusUpdate = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({ status: 'Shortlisted' }),
    });
    assert.equal(validStatusUpdate.status, 200);
    assert.equal(validStatusUpdate.body.data.status, 'Shortlisted');
    console.log('  ✅ Owning Employer A updated status to Shortlisted with 200 OK');

    // 15. Verify updated status reflected in Seeker A's view
    console.log('\n▶ Test 14: GET /api/v1/applications/my (Verify updated status reflected)');
    const seekerAVerifyStatus = await request('/api/v1/applications/my', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(seekerAVerifyStatus.status, 200);
    assert.equal(seekerAVerifyStatus.body.data[0].status, 'Shortlisted');
    console.log('  ✅ Jobseeker verified new status is Shortlisted');

    // 16. Missing jobId in application request
    console.log('\n▶ Test 15: POST /api/v1/applications (Missing jobId)');
    const missingJobIdApp = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({ coverLetter: 'No job id provided' }),
    });
    assert.equal(missingJobIdApp.status, 400);
    assert.match(missingJobIdApp.body.message, /jobId is required/i);
    console.log('  ✅ Missing jobId rejected with 400 Bad Request');

    // 17. Unauthenticated status update
    console.log('\n▶ Test 16: PATCH /api/v1/applications/:id/status (Unauthenticated)');
    const unauthStatusUpdate = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Reviewed' }),
    });
    assert.equal(unauthStatusUpdate.status, 401);
    console.log('  ✅ Unauthenticated status update rejected with 401 Unauthorized');

    // 18. Jobseeker blocked from updating application status
    console.log('\n▶ Test 17: PATCH /api/v1/applications/:id/status (Jobseeker blocked)');
    const seekerStatusUpdate = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: JSON.stringify({ status: 'Hired' }),
    });
    assert.equal(seekerStatusUpdate.status, 403);
    console.log('  ✅ Jobseeker status update blocked with 403 Forbidden');

    // 19. Nonexistent application ID returns 404
    console.log('\n▶ Test 18: PATCH /api/v1/applications/:id/status (Non-existent application ID)');
    const notFoundStatusUpdate = await request('/api/v1/applications/507f1f77bcf86cd799439011/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({ status: 'Reviewed' }),
    });
    assert.equal(notFoundStatusUpdate.status, 404);
    assert.match(notFoundStatusUpdate.body.message, /Application not found/i);
    console.log('  ✅ Non-existent application ID returned 404 Not Found');

    // 20. Malformed application ID returns 400
    console.log('\n▶ Test 19: PATCH /api/v1/applications/:id/status (Malformed application ID)');
    const malformedStatusUpdate = await request('/api/v1/applications/invalid-app-id/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({ status: 'Reviewed' }),
    });
    assert.equal(malformedStatusUpdate.status, 400);
    assert.match(malformedStatusUpdate.body.message, /Invalid Application ID format/i);
    console.log('  ✅ Malformed application ID rejected with 400 Bad Request');

    // 21. GET /api/v1/applications/employer (Aggregated pipeline view)
    console.log('\n▶ Test 20: GET /api/v1/applications/employer (Aggregated employer pipeline)');
    const empPipeline = await request('/api/v1/applications/employer', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empPipeline.status, 200);
    assert.equal(empPipeline.body.count, 1);
    assert.equal(empPipeline.body.data[0]._id, createdAppId);
    assert.equal(empPipeline.body.data[0].applicant.password, undefined, 'Applicant password must never be exposed');
    console.log('  ✅ Owning employer retrieved candidate pipeline with sanitized user profile');

    // 22. Lifecycle status transition to Hired
    console.log('\n▶ Test 21: PATCH /api/v1/applications/:id/status (Transition to Hired)');
    const hireStatusUpdate = await request(`/api/v1/applications/${createdAppId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: JSON.stringify({ status: 'Hired' }),
    });
    assert.equal(hireStatusUpdate.status, 200);
    assert.equal(hireStatusUpdate.body.data.status, 'Hired');
    console.log('  ✅ Status successfully updated to Hired');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 All 21 Application System tests passed with flying colors!');
    console.log('════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Application test suite failed:', err);
    process.exit(1);
  } finally {
    await testEnv.teardown();
  }
}

runApplicationTests();
