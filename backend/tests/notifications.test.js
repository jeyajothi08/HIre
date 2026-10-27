import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { setupTestEnvironment } from './testHarness.js';
import { createNotification } from '../src/services/notificationService.js';
import { sendEmailAlert, isEmailConfigured } from '../src/services/emailService.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

const timestamp = Date.now();
const seekerAEmail = `seeker_notif_a_${timestamp}@hirehub.local`;
const seekerBEmail = `seeker_notif_b_${timestamp}@hirehub.local`;
const employerAEmail = `emp_notif_a_${timestamp}@hirehub.local`;
const employerBEmail = `emp_notif_b_${timestamp}@hirehub.local`;
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

async function runNotificationTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 8 Notification & Email Alerts Test Suite against ${BASE_URL}...`);

  let seekerAToken = null;
  let seekerBToken = null;
  let employerAToken = null;
  let employerBToken = null;
  let employerAId = null;
  let employerAJobId = null;
  let applicationId = null;
  let employerNotificationId = null;
  let seekerNotificationId = null;
  let testMongod = null;

  try {
    if (mongoose.connection.readyState === 0) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      testMongod = await MongoMemoryServer.create();
      await mongoose.connect(testMongod.getUri());
    }

    // 0. Setup accounts & initial job
    console.log('\n▶ Setup: Registering test users (Jobseekers A & B, Employers A & B)...');

    // Register Seeker A
    const regSeekerA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Seeker Notif A', email: seekerAEmail, password, role: 'jobseeker' },
    });
    seekerAToken = regSeekerA.body.token;
    assert.equal(regSeekerA.status, 201);

    // Register Seeker B
    const regSeekerB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Seeker Notif B', email: seekerBEmail, password, role: 'jobseeker' },
    });
    seekerBToken = regSeekerB.body.token;
    assert.equal(regSeekerB.status, 201);

    // Register Employer A
    const regEmpA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Employer Notif A', email: employerAEmail, password, role: 'employer' },
    });
    employerAToken = regEmpA.body.token;
    employerAId = regEmpA.body.data.id || regEmpA.body.data._id;
    assert.equal(regEmpA.status, 201);

    // Register Employer B
    const regEmpB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Employer Notif B', email: employerBEmail, password, role: 'employer' },
    });
    employerBToken = regEmpB.body.token;
    assert.equal(regEmpB.status, 201);

    // Employer A creates a job posting
    const jobRes = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: {
        title: 'Senior Systems Architect',
        company: 'Cloud Scale Inc',
        location: 'San Francisco, CA',
        employmentType: 'Full-time',
        workplaceType: 'Remote',
        salaryMin: 180000,
        salaryMax: 230000,
        description: 'Design distributed notification systems and event loops.',
      },
    });
    assert.equal(jobRes.status, 201);
    employerAJobId = jobRes.body.data._id;
    console.log(`  ✅ Users and test job created. Job ID: ${employerAJobId}`);

    // --- TEST 1: Unauthenticated notifications access ---
    console.log('\n▶ Test 1: GET /api/v1/notifications (Unauthenticated)');
    const unauthRes = await request('/api/v1/notifications');
    assert.equal(unauthRes.status, 401);
    console.log('  ✅ Unauthenticated notification access rejected with 401');

    // --- TEST 2: Initial notifications list empty ---
    console.log('\n▶ Test 2: GET /api/v1/notifications (Initial empty state)');
    const emptyRes = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(emptyRes.status, 200);
    assert.equal(emptyRes.body.count, 0);
    assert.equal(emptyRes.body.unreadCount, 0);
    console.log('  ✅ Initial notification inbox is empty as expected');

    // --- TEST 3: Initial unread count is 0 ---
    console.log('\n▶ Test 3: GET /api/v1/notifications/unread-count');
    const unreadRes = await request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(unreadRes.status, 200);
    assert.equal(unreadRes.body.count, 0);
    console.log('  ✅ Initial unread count is 0');

    // --- TEST 4: Jobseeker applies -> Employer notification created automatically ---
    console.log('\n▶ Test 4: POST /api/v1/applications -> Employer receives new_application notification');
    const applyRes = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: {
        jobId: employerAJobId,
        coverLetter: 'I am excited to apply for the Senior Systems Architect position.',
      },
    });
    assert.equal(applyRes.status, 201);
    applicationId = applyRes.body.data._id;

    // Small delay to allow background notification creation to settle
    await new Promise((r) => setTimeout(r, 400));

    // Employer A checks unread count
    const empUnreadRes = await request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empUnreadRes.status, 200);
    assert.equal(empUnreadRes.body.count, 1);
    console.log('  ✅ Employer unread count incremented to 1');

    // --- TEST 5: Employer fetches notifications list ---
    console.log('\n▶ Test 5: GET /api/v1/notifications (Employer inspects notification)');
    const empNotifList = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empNotifList.status, 200);
    assert.equal(empNotifList.body.count, 1);
    const notif = empNotifList.body.data[0];
    assert.equal(notif.type, 'new_application');
    assert.equal(notif.read, false);
    assert.ok(notif.title.includes('Senior Systems Architect'));
    assert.ok(notif.message.includes('Seeker Notif A'));
    employerNotificationId = notif._id;
    console.log(`  ✅ Employer received correct application notification. ID: ${employerNotificationId}`);

    // --- TEST 6: Strict Cross-User Notification Isolation ---
    console.log('\n▶ Test 6: Cross-user isolation check (Seeker B & Employer B see 0 notifications)');
    const seekerBNotifs = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${seekerBToken}` },
    });
    assert.equal(seekerBNotifs.body.count, 0);

    const empBNotifs = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(empBNotifs.body.count, 0);
    console.log('  ✅ Unrelated users isolated: 0 notifications visible');

    // --- TEST 7: Application status update -> Jobseeker notification created ---
    console.log('\n▶ Test 7: PATCH /api/v1/applications/:id/status -> Jobseeker receives status_update notification');
    const updateStatusRes = await request(`/api/v1/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: { status: 'Shortlisted' },
    });
    assert.equal(updateStatusRes.status, 200);

    await new Promise((r) => setTimeout(r, 400));

    // Seeker A checks unread count & notifications
    const seekerNotifRes = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(seekerNotifRes.status, 200);
    assert.equal(seekerNotifRes.body.count, 1);
    const seekerNotif = seekerNotifRes.body.data[0];
    assert.equal(seekerNotif.type, 'status_update');
    assert.equal(seekerNotif.read, false);
    assert.ok(seekerNotif.message.includes('Shortlisted'));
    seekerNotificationId = seekerNotif._id;
    console.log(`  ✅ Jobseeker received status update notification. ID: ${seekerNotificationId}`);

    // --- TEST 8: Unauthorized mark as read blocked ---
    console.log('\n▶ Test 8: PATCH /api/v1/notifications/:id/read (Cross-user unauthorized update)');
    const unauthMark = await request(`/api/v1/notifications/${seekerNotificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(unauthMark.status, 403);
    console.log('  ✅ Cross-user notification modification blocked with 403 Forbidden');

    // --- TEST 9: Invalid notification ID format ---
    console.log('\n▶ Test 9: PATCH /api/v1/notifications/:id/read (Invalid ObjectId)');
    const invalidIdRes = await request('/api/v1/notifications/not-an-id/read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(invalidIdRes.status, 400);
    console.log('  ✅ Malformed notification ID rejected with 400 Bad Request');

    // --- TEST 10: Authorized mark as read ---
    console.log('\n▶ Test 10: PATCH /api/v1/notifications/:id/read (Authorized owner mark read)');
    const markReadRes = await request(`/api/v1/notifications/${seekerNotificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(markReadRes.status, 200);
    assert.equal(markReadRes.body.data.read, true);

    const seekerUnreadAfter = await request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(seekerUnreadAfter.body.count, 0);
    console.log('  ✅ Notification marked read and unread count reduced to 0');

    // --- TEST 11: Idempotency & duplicate prevention ---
    console.log('\n▶ Test 11: Idempotency deduplication check on createNotification');
    const firstNotif = await createNotification({
      recipient: employerAId,
      type: 'system',
      title: 'Platform Maintenance Notice',
      message: 'Scheduled maintenance this Sunday.',
      idempotencyKey: `maint_test_${timestamp}`,
    });
    assert.ok(firstNotif);

    const duplicateAttempt = await createNotification({
      recipient: employerAId,
      type: 'system',
      title: 'Platform Maintenance Notice (Dupe)',
      message: 'Scheduled maintenance this Sunday.',
      idempotencyKey: `maint_test_${timestamp}`,
    });
    assert.equal(firstNotif._id.toString(), duplicateAttempt._id.toString());
    console.log('  ✅ Duplicate notification suppressed via idempotencyKey');

    // --- TEST 12: Mark all as read ---
    console.log('\n▶ Test 12: PATCH /api/v1/notifications/read-all (Mark all as read)');
    const markAllRes = await request('/api/v1/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(markAllRes.status, 200);
    assert.ok(markAllRes.body.modifiedCount >= 1);

    const empUnreadFinal = await request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empUnreadFinal.body.count, 0);
    console.log('  ✅ Mark-all-read cleared all unread notifications');

    // --- TEST 13: Email service graceful fallback ---
    console.log('\n▶ Test 13: Email provider graceful fallback (Unconfigured mode)');
    const isConfigured = isEmailConfigured();
    assert.equal(isConfigured, false); // Default when no SMTP configured

    const emailResult = await sendEmailAlert({
      to: 'candidate@example.com',
      subject: 'Test Notification',
      text: 'Test body',
      idempotencyKey: `email_test_${timestamp}`,
    });
    assert.equal(emailResult.delivered, false);
    assert.equal(emailResult.reason, 'provider_unconfigured');
    console.log('  ✅ Unconfigured email provider handled gracefully without throwing');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 All 13 Notification & Email Alert tests passed with flying colors!');
    console.log('════════════════════════════════════════════════════════════\n');
  } finally {
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

runNotificationTests().catch((err) => {
  console.error('\n❌ Notification test suite failed:', err);
  process.exit(1);
});
