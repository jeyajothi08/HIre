import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { setupTestEnvironment } from './testHarness.js';
import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import app from '../src/app.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

const timestamp = Date.now();
const seekerEmail = `seeker_admin_test_${timestamp}@hirehub.local`;
const employerEmail = `emp_admin_test_${timestamp}@hirehub.local`;
const adminEmail = `admin_test_${timestamp}@hirehub.local`;
const password = 'SecurePassword123!';

async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, body, headers: res.headers };
}

async function runAdminTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 9 Admin Dashboard & Job Moderation Test Suite against ${BASE_URL}...`);

  let seekerToken = null;
  let employerToken = null;
  let adminToken = null;
  let employerId = null;
  let pendingJobId = null;
  let approvedJobId = null;
  let testMongod = null;
  let localServer = null;

  try {
    if (mongoose.connection.readyState === 0) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      testMongod = await MongoMemoryServer.create();
      await mongoose.connect(testMongod.getUri());
      localServer = app.listen(0);
      await new Promise((resolve) => localServer.once('listening', resolve));
      BASE_URL = `http://localhost:${localServer.address().port}`;
    }

    console.log('\n▶ Setup: Provisioning test accounts (Jobseeker, Employer, Admin)...');

    // 1. Register Jobseeker
    const regSeeker = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Regular Jobseeker', email: seekerEmail, password, role: 'jobseeker' },
    });
    assert.equal(regSeeker.status, 201);
    seekerToken = regSeeker.body.token;

    // 2. Register Employer
    const regEmp = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Tech Employer', email: employerEmail, password, role: 'employer' },
    });
    assert.equal(regEmp.status, 201);
    employerToken = regEmp.body.token;
    employerId = regEmp.body.data.id || regEmp.body.data._id;

    // 3. Create Admin directly in database (simulating safe seedAdmin CLI script)
    const adminUser = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password,
      role: 'admin',
    });
    adminToken = adminUser.generateAuthToken();

    console.log('  ✅ Accounts provisioned successfully. Admin ID:', adminUser._id);

    // --- TEST 1: Unauthenticated Admin Endpoint Access ---
    console.log('\n▶ Test 1: GET /api/v1/admin/metrics (Unauthenticated)');
    const unauthMetrics = await request('/api/v1/admin/metrics');
    assert.equal(unauthMetrics.status, 401);
    console.log('  ✅ Unauthenticated admin request blocked with 401 Unauthorized');

    // --- TEST 2: Jobseeker Role Blocked from Admin Endpoints ---
    console.log('\n▶ Test 2: GET /api/v1/admin/metrics (Jobseeker role)');
    const seekerMetrics = await request('/api/v1/admin/metrics', {
      headers: { Authorization: `Bearer ${seekerToken}` },
    });
    assert.equal(seekerMetrics.status, 403);
    console.log('  ✅ Jobseeker blocked from admin routes with 403 Forbidden');

    // --- TEST 3: Employer Role Blocked from Admin Endpoints ---
    console.log('\n▶ Test 3: GET /api/v1/admin/metrics (Employer role)');
    const empMetrics = await request('/api/v1/admin/metrics', {
      headers: { Authorization: `Bearer ${employerToken}` },
    });
    assert.equal(empMetrics.status, 403);
    console.log('  ✅ Employer blocked from admin routes with 403 Forbidden');

    // --- TEST 4: Self-Promotion Prevention ---
    console.log('\n▶ Test 4: POST /api/v1/auth/register (Attempting to self-register as admin)');
    const selfAdminReg = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        name: 'Malicious User',
        email: `hacker_${timestamp}@hirehub.local`,
        password,
        role: 'admin',
      },
    });
    assert.equal(selfAdminReg.status, 400);
    assert.ok(selfAdminReg.body.message.includes('Invalid role'));
    console.log('  ✅ Self-promotion to admin blocked with 400 Bad Request');

    // --- TEST 5: Authorized Admin Metrics Retrieval ---
    console.log('\n▶ Test 5: GET /api/v1/admin/metrics (Authorized Admin)');
    const adminMetricsRes = await request('/api/v1/admin/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminMetricsRes.status, 200);
    assert.equal(adminMetricsRes.body.success, true);
    assert.ok(adminMetricsRes.body.data.totalUsers >= 3);
    assert.ok(typeof adminMetricsRes.body.data.totalJobs === 'number');
    assert.ok(typeof adminMetricsRes.body.data.totalApplications === 'number');
    assert.ok(Array.isArray(adminMetricsRes.body.data.recentActivity));
    console.log('  ✅ Server-derived metrics and platform activity feed returned');

    // --- TEST 6: Create Job for Moderation Queue ---
    console.log('\n▶ Test 6: Creating jobs with pending status for moderation testing...');
    const pendingJob = await Job.create({
      title: 'Distributed Infrastructure Lead',
      company: 'HighScale Cloud',
      location: 'Remote',
      employmentType: 'Full-time',
      workplaceType: 'Remote',
      description: 'Design zero-downtime distributed systems and caching layers.',
      createdBy: employerId,
      status: 'pending',
      isActive: true,
    });
    pendingJobId = pendingJob._id.toString();
    console.log(`  ✅ Pending job created. ID: ${pendingJobId}`);

    // --- TEST 7: Public Search Excludes Pending Job ---
    console.log('\n▶ Test 7: GET /api/v1/jobs?q=Infrastructure (Public Search Isolation)');
    const publicSearchPending = await request('/api/v1/jobs?q=Infrastructure');
    assert.equal(publicSearchPending.status, 200);
    const hasPendingInPublic = publicSearchPending.body.data.some((j) => j._id === pendingJobId);
    assert.equal(hasPendingInPublic, false, 'Pending job must NOT be visible in public search');
    console.log('  ✅ Pending job hidden from public search as expected');

    // --- TEST 8: Admin Moderation Queue Listing ---
    console.log('\n▶ Test 8: GET /api/v1/admin/jobs?status=pending (Admin Job Queue)');
    const adminJobsQueue = await request('/api/v1/admin/jobs?status=pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminJobsQueue.status, 200);
    assert.ok(adminJobsQueue.body.data.length >= 1);
    const queuedJob = adminJobsQueue.body.data.find((j) => j._id === pendingJobId);
    assert.ok(queuedJob, 'Pending job must appear in admin moderation queue');
    assert.equal(queuedJob.status, 'pending');
    console.log('  ✅ Admin moderation queue lists pending jobs with pagination');

    // --- TEST 9: Reject Job Validation (Requires reason) ---
    console.log('\n▶ Test 9: PATCH /api/v1/admin/jobs/:id/moderate (Reject without reason)');
    const rejectNoReason = await request(`/api/v1/admin/jobs/${pendingJobId}/moderate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: '' },
    });
    assert.equal(rejectNoReason.status, 400);
    assert.ok(rejectNoReason.body.message.includes('rejection reason'));
    console.log('  ✅ Rejection without reason correctly rejected with 400');

    // --- TEST 10: Reject Job with Valid Reason ---
    console.log('\n▶ Test 10: PATCH /api/v1/admin/jobs/:id/moderate (Reject with valid reason)');
    const rejectValid = await request(`/api/v1/admin/jobs/${pendingJobId}/moderate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'rejected',
        rejectionReason: 'Job description violates salary transparency guidelines.',
      },
    });
    assert.equal(rejectValid.status, 200);
    assert.equal(rejectValid.body.data.status, 'rejected');
    assert.equal(rejectValid.body.data.rejectionReason, 'Job description violates salary transparency guidelines.');
    console.log('  ✅ Job successfully rejected with reason and reviewer recorded');

    // --- TEST 11: Public Search Excludes Rejected Job ---
    console.log('\n▶ Test 11: GET /api/v1/jobs?q=Infrastructure (Public Search Isolation for Rejected)');
    const publicSearchRejected = await request('/api/v1/jobs?q=Infrastructure');
    const hasRejectedInPublic = publicSearchRejected.body.data.some((j) => j._id === pendingJobId);
    assert.equal(hasRejectedInPublic, false, 'Rejected job must NOT appear in public search');
    console.log('  ✅ Rejected job remains hidden from public search');

    // --- TEST 12: Admin Approves Job & Verifies Public Search ---
    console.log('\n▶ Test 12: PATCH /api/v1/admin/jobs/:id/moderate (Approve Job)');
    const jobToApprove = await Job.create({
      title: 'Principal Reliability Engineer',
      company: 'Scale Ops Global',
      location: 'New York, NY',
      employmentType: 'Full-time',
      workplaceType: 'Remote',
      description: 'Ensure 99.999% uptime for core distributed platform services.',
      createdBy: employerId,
      status: 'pending',
      isActive: true,
    });
    approvedJobId = jobToApprove._id.toString();

    const approveRes = await request(`/api/v1/admin/jobs/${approvedJobId}/moderate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.status, 'approved');
    assert.ok(approveRes.body.data.moderatedAt);

    // Verify it now appears in public search!
    const publicSearchApproved = await request('/api/v1/jobs?q=Reliability');
    assert.equal(publicSearchApproved.status, 200);
    const hasApprovedInPublic = publicSearchApproved.body.data.some((j) => j._id === approvedJobId);
    assert.equal(hasApprovedInPublic, true, 'Approved job must be visible in public search');
    console.log('  ✅ Job approved and confirmed live in public search');

    // --- TEST 13: Admin Deactivation of Published Job ---
    console.log('\n▶ Test 13: PATCH /api/v1/admin/jobs/:id/toggle-active (Deactivate published job)');
    const deactivateRes = await request(`/api/v1/admin/jobs/${approvedJobId}/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: false },
    });
    assert.equal(deactivateRes.status, 200);
    assert.equal(deactivateRes.body.data.isActive, false);

    // Verify deactivated job is removed from public search
    const publicSearchDeactivated = await request('/api/v1/jobs?q=Reliability');
    const hasDeactivatedInPublic = publicSearchDeactivated.body.data.some((j) => j._id === approvedJobId);
    assert.equal(hasDeactivatedInPublic, false, 'Deactivated job must be hidden from public search');
    console.log('  ✅ Deactivated job hidden from public search');

    // --- TEST 14: Admin Reactivation of Published Job ---
    console.log('\n▶ Test 14: PATCH /api/v1/admin/jobs/:id/toggle-active (Reactivate job)');
    const reactivateRes = await request(`/api/v1/admin/jobs/${approvedJobId}/toggle-active`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { isActive: true },
    });
    assert.equal(reactivateRes.status, 200);
    assert.equal(reactivateRes.body.data.isActive, true);

    const publicSearchReactivated = await request('/api/v1/jobs?q=Reliability');
    const hasReactivatedInPublic = publicSearchReactivated.body.data.some((j) => j._id === approvedJobId);
    assert.equal(hasReactivatedInPublic, true, 'Reactivated job must reappear in public search');
    console.log('  ✅ Reactivated job reappeared in public search');

    // --- TEST 15: Admin User Management Listing ---
    console.log('\n▶ Test 15: GET /api/v1/admin/users (Paginated User List with Role Filter)');
    const userListRes = await request('/api/v1/admin/users?role=employer', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(userListRes.status, 200);
    assert.ok(userListRes.body.data.length >= 1);
    assert.ok(userListRes.body.data.every((u) => u.role === 'employer'));
    console.log('  ✅ User management endpoint returns filtered user list');

    // --- TEST 16: Invalid Job ID & Not Found Handling ---
    console.log('\n▶ Test 16: Admin moderation error handling (Malformed & Non-existent IDs)');
    const malformedMod = await request('/api/v1/admin/jobs/bad-id/moderate', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert.equal(malformedMod.status, 400);

    const notFoundMod = await request('/api/v1/admin/jobs/507f1f77bcf86cd799439011/moderate', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert.equal(notFoundMod.status, 404);
    console.log('  ✅ Malformed ID (400) and Non-existent ID (404) correctly handled');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 All 16 Admin Dashboard & Job Moderation tests passed!');
    console.log('════════════════════════════════════════════════════════════\n');
  } finally {
    if (localServer) {
      await new Promise((resolve) => localServer.close(resolve));
    }
    if (testMongod) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await testMongod.stop();
    } else if (mongoose.connection.readyState !== 0 && !testEnv.isEphemeral) {
      await mongoose.disconnect();
    }
    await testEnv.teardown();
  }
}

runAdminTests().catch((err) => {
  console.error('\n❌ Admin test suite failed:', err);
  process.exit(1);
});
