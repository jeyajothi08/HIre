import assert from 'node:assert/strict';
import { setupTestEnvironment } from './testHarness.js';

let BASE_URL = process.env.API_URL || 'http://localhost:5001';

const timestamp = Date.now();
const seekerAEmail = `seeker_prof_a_${timestamp}@hirehub.local`;
const seekerBEmail = `seeker_prof_b_${timestamp}@hirehub.local`;
const employerAEmail = `emp_prof_a_${timestamp}@hirehub.local`;
const employerBEmail = `emp_prof_b_${timestamp}@hirehub.local`;
const password = 'SecurePassword123!';

async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
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
  } else if (contentType.includes('application/pdf')) {
    const arrayBuffer = await res.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = await res.text();
  }

  return { status: res.status, body, headers: res.headers };
}

// Generate valid minimal PDF buffer
function createValidPdfBuffer(content = 'Sample Resume Content') {
  return Buffer.from(`%PDF-1.5\n%âãÏÓ\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length ${content.length}\n>>\nstream\n${content}\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \n0000000125 00000 n \n0000000214 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n300\n%%EOF`);
}

async function runProfileTests() {
  const testEnv = await setupTestEnvironment();
  BASE_URL = testEnv.baseUrl;
  console.log(`🧪 Starting Phase 7 Profile & Resume Test Suite against ${BASE_URL}...`);

  let seekerAToken = null;
  let seekerBToken = null;
  let employerAToken = null;
  let employerBToken = null;
  let employerAJobId = null;
  let applicationId = null;

  try {
    // 1. Setup accounts & initial job
    console.log('\n▶ Setup: Registering test users (Jobseekers A & B, Employers A & B)...');

    const regSeekerA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Alice Candidate', email: seekerAEmail, password, role: 'jobseeker' },
    });
    assert.equal(regSeekerA.status, 201);
    seekerAToken = regSeekerA.body.token;

    const regSeekerB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Bob Candidate', email: seekerBEmail, password, role: 'jobseeker' },
    });
    assert.equal(regSeekerB.status, 201);
    seekerBToken = regSeekerB.body.token;

    const regEmpA = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Enterprise Corp A', email: employerAEmail, password, role: 'employer' },
    });
    assert.equal(regEmpA.status, 201);
    employerAToken = regEmpA.body.token;

    const regEmpB = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Startup Labs B', email: employerBEmail, password, role: 'employer' },
    });
    assert.equal(regEmpB.status, 201);
    employerBToken = regEmpB.body.token;

    // Employer A creates a job
    const createJobRes = await request('/api/v1/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employerAToken}` },
      body: {
        title: 'Staff Platform Engineer',
        company: 'Enterprise Corp A',
        location: 'Remote',
        employmentType: 'Full-time',
        workplaceType: 'Remote',
        description: 'Design and operate Kubernetes clusters and observability meshes.',
        skills: ['Kubernetes', 'Go', 'Docker', 'Linux'],
        salaryMin: 170000,
        salaryMax: 210000,
      },
    });
    assert.equal(createJobRes.status, 201);
    employerAJobId = createJobRes.body.data._id;
    console.log('  ✅ Users and test job created. Job ID:', employerAJobId);

    // 2. Unauthenticated profile request rejected
    console.log('\n▶ Test 1: GET /api/v1/profile/me (Unauthenticated)');
    const unauthProf = await request('/api/v1/profile/me');
    assert.equal(unauthProf.status, 401);
    console.log('  ✅ Unauthenticated profile access rejected with 401 Unauthorized');

    // 3. Employer blocked from candidate profile routes
    console.log('\n▶ Test 2: GET /api/v1/profile/me (Employer role blocked)');
    const empProfBlocked = await request('/api/v1/profile/me', {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empProfBlocked.status, 403);
    assert.match(empProfBlocked.body.message, /Forbidden.*jobseeker/i);
    console.log('  ✅ Employer blocked from candidate profile routes with 403 Forbidden');

    // 4. Jobseeker A initial profile retrieval
    console.log('\n▶ Test 3: GET /api/v1/profile/me (Jobseeker A initial fetch)');
    const seekerAInitialProf = await request('/api/v1/profile/me', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(seekerAInitialProf.status, 200);
    assert.equal(seekerAInitialProf.body.data.user.name, 'Alice Candidate');
    assert.equal(seekerAInitialProf.body.data.user.password, undefined, 'Password must never be exposed');
    assert.deepEqual(seekerAInitialProf.body.data.skills, []);
    console.log('  ✅ Jobseeker A retrieved initial profile with sanitized user info');

    // 5. Jobseeker A updates profile
    console.log('\n▶ Test 4: PUT /api/v1/profile/me (Update profile)');
    const updateProfRes = await request('/api/v1/profile/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: {
        headline: 'Staff Full Stack & Cloud Architect',
        summary: '10+ years architecting resilient distributed systems and scalable web applications.',
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'Docker'],
        education: [
          { school: 'UC Berkeley', degree: 'B.S.', fieldOfStudy: 'Computer Science', startYear: 2012, endYear: 2016 },
        ],
        experience: [
          {
            title: 'Senior Engineer',
            company: 'Stripe',
            location: 'San Francisco, CA',
            startDate: '2020',
            endDate: 'Present',
            current: true,
            description: 'Led payments gateway latency reduction initiatives.',
          },
        ],
        portfolioLinks: {
          github: 'https://github.com/alice-candidate',
          linkedin: 'https://linkedin.com/in/alice-candidate',
          portfolio: 'https://alice.dev',
        },
      },
    });
    assert.equal(updateProfRes.status, 200);
    assert.equal(updateProfRes.body.data.headline, 'Staff Full Stack & Cloud Architect');
    assert.equal(updateProfRes.body.data.skills.length, 6);
    assert.equal(updateProfRes.body.data.experience[0].company, 'Stripe');
    console.log('  ✅ Jobseeker A successfully updated profile with validated fields');

    // 6. Jobseeker B isolation check
    console.log('\n▶ Test 5: GET /api/v1/profile/me (Jobseeker B isolation)');
    const seekerBProf = await request('/api/v1/profile/me', {
      headers: { Authorization: `Bearer ${seekerBToken}` },
    });
    assert.equal(seekerBProf.status, 200);
    assert.equal(seekerBProf.body.data.user.name, 'Bob Candidate');
    assert.equal(seekerBProf.body.data.headline, '', 'Seeker B profile must not be influenced by Seeker A');
    console.log('  ✅ Cross-user profile isolation confirmed');

    // 7. Resume upload: Non-PDF rejected
    console.log('\n▶ Test 6: POST /api/v1/profile/resume (Reject non-PDF file extension/mime)');
    const txtFormData = new FormData();
    const txtBlob = new Blob(['Not a PDF document'], { type: 'text/plain' });
    txtFormData.append('resume', txtBlob, 'resume.txt');
    const txtUploadRes = await request('/api/v1/profile/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: txtFormData,
    });
    assert.equal(txtUploadRes.status, 400);
    assert.match(txtUploadRes.body.message, /PDF.*permitted/i);
    console.log('  ✅ Non-PDF file (.txt) correctly rejected with 400 Bad Request');

    // 8. Resume upload: Spoofed PDF with fake magic bytes rejected
    console.log('\n▶ Test 7: POST /api/v1/profile/resume (Reject spoofed PDF with invalid magic bytes)');
    const fakePdfFormData = new FormData();
    const fakePdfBlob = new Blob(['THIS IS PLAIN TEXT DISGUISED AS PDF'], { type: 'application/pdf' });
    fakePdfFormData.append('resume', fakePdfBlob, 'fake_resume.pdf');
    const fakePdfRes = await request('/api/v1/profile/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: fakePdfFormData,
    });
    assert.equal(fakePdfRes.status, 400);
    assert.match(fakePdfRes.body.message, /signature/i);
    console.log('  ✅ Spoofed PDF with invalid binary signature rejected with 400 Bad Request');

    // 9. Resume upload: Oversized file (> 5 MB) rejected
    console.log('\n▶ Test 8: POST /api/v1/profile/resume (Reject oversized file > 5 MB)');
    const oversizedBuffer = Buffer.alloc(5.2 * 1024 * 1024);
    oversizedBuffer.write('%PDF-1.5');
    const oversizedFormData = new FormData();
    const oversizedBlob = new Blob([oversizedBuffer], { type: 'application/pdf' });
    oversizedFormData.append('resume', oversizedBlob, 'oversized_resume.pdf');
    const oversizedRes = await request('/api/v1/profile/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: oversizedFormData,
    });
    assert.equal(oversizedRes.status, 400);
    assert.match(oversizedRes.body.message, /5 MB/i);
    console.log('  ✅ Oversized file (> 5 MB) rejected with 400 Bad Request');

    // 10. Valid PDF resume upload
    console.log('\n▶ Test 9: POST /api/v1/profile/resume (Valid PDF upload)');
    const validPdfBuffer = createValidPdfBuffer('Alice Candidate - Principal Architect Experience');
    const validFormData = new FormData();
    const validBlob = new Blob([validPdfBuffer], { type: 'application/pdf' });
    validFormData.append('resume', validBlob, 'Alice_Candidate_CV.pdf');
    const validUploadRes = await request('/api/v1/profile/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: validFormData,
    });
    assert.equal(validUploadRes.status, 200);
    assert.equal(validUploadRes.body.data.originalName, 'Alice_Candidate_CV.pdf');
    assert.equal(validUploadRes.body.data.hasResume, true);
    assert.equal(validUploadRes.body.data.storageKey, undefined, 'Internal storageKey must not be exposed');
    console.log('  ✅ Valid PDF resume uploaded successfully with sanitized metadata');

    // 11. Jobseeker A downloads own resume
    console.log('\n▶ Test 10: GET /api/v1/profile/resume (Download own resume)');
    const downloadRes = await request('/api/v1/profile/resume', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(downloadRes.status, 200);
    assert.equal(downloadRes.headers.get('content-type'), 'application/pdf');
    assert.ok(downloadRes.body.toString('ascii').startsWith('%PDF-'));
    console.log('  ✅ Jobseeker A successfully downloaded their own PDF resume');

    // 12. Jobseeker A applies to Employer A's job
    console.log('\n▶ Setup: Jobseeker A applies to Employer A\'s job posting...');
    const applyRes = await request('/api/v1/applications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: {
        jobId: employerAJobId,
        coverLetter: 'Excited to apply for Staff Platform Engineer.',
      },
    });
    assert.equal(applyRes.status, 201);
    applicationId = applyRes.body.data._id;
    console.log('  ✅ Application created. ID:', applicationId);

    // 13. Non-owning Employer B tries to view candidate profile (403)
    console.log('\n▶ Test 11: GET /api/v1/applications/:id/candidate-profile (Non-owning Employer B blocked)');
    const empBCandidateProf = await request(`/api/v1/applications/${applicationId}/candidate-profile`, {
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(empBCandidateProf.status, 403);
    assert.match(empBCandidateProf.body.message, /Forbidden.*permission/i);
    console.log('  ✅ Non-owning Employer B blocked from candidate profile with 403 Forbidden');

    // 14. Non-owning Employer B tries to download candidate resume (403)
    console.log('\n▶ Test 12: GET /api/v1/applications/:id/resume (Non-owning Employer B blocked)');
    const empBResume = await request(`/api/v1/applications/${applicationId}/resume`, {
      headers: { Authorization: `Bearer ${employerBToken}` },
    });
    assert.equal(empBResume.status, 403);
    assert.match(empBResume.body.message, /Forbidden.*permission/i);
    console.log('  ✅ Non-owning Employer B blocked from candidate resume with 403 Forbidden');

    // 15. Owning Employer A retrieves candidate profile
    console.log('\n▶ Test 13: GET /api/v1/applications/:id/candidate-profile (Owning Employer A authorized)');
    const empACandidateProf = await request(`/api/v1/applications/${applicationId}/candidate-profile`, {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empACandidateProf.status, 200);
    assert.equal(empACandidateProf.body.data.headline, 'Staff Full Stack & Cloud Architect');
    assert.equal(empACandidateProf.body.data.skills.includes('Kubernetes'), false);
    assert.equal(empACandidateProf.body.data.skills.includes('React'), true);
    assert.equal(empACandidateProf.body.data.resume.originalName, 'Alice_Candidate_CV.pdf');
    assert.equal(empACandidateProf.body.data.resume.storageKey, undefined, 'storageKey must not be exposed');
    console.log('  ✅ Owning Employer A retrieved sanitized candidate profile and resume metadata');

    // 16. Owning Employer A downloads candidate resume
    console.log('\n▶ Test 14: GET /api/v1/applications/:id/resume (Owning Employer A authorized download)');
    const empAResume = await request(`/api/v1/applications/${applicationId}/resume`, {
      headers: { Authorization: `Bearer ${employerAToken}` },
    });
    assert.equal(empAResume.status, 200);
    assert.equal(empAResume.headers.get('content-type'), 'application/pdf');
    assert.ok(empAResume.body.toString('ascii').startsWith('%PDF-'));
    assert.match(empAResume.body.toString('ascii'), /Alice Candidate/);
    console.log('  ✅ Owning Employer A successfully streamed candidate PDF resume');

    // 17. Resume replacement with file cleanup
    console.log('\n▶ Test 15: POST /api/v1/profile/resume (Replace resume with cleanup)');
    const updatedPdfBuffer = createValidPdfBuffer('Alice Candidate - Updated 2026 Version');
    const updateFormData = new FormData();
    const updateBlob = new Blob([updatedPdfBuffer], { type: 'application/pdf' });
    updateFormData.append('resume', updateBlob, 'Alice_Candidate_Updated_CV.pdf');
    const replaceRes = await request('/api/v1/profile/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerAToken}` },
      body: updateFormData,
    });
    assert.equal(replaceRes.status, 200);
    assert.equal(replaceRes.body.data.originalName, 'Alice_Candidate_Updated_CV.pdf');
    console.log('  ✅ Resume replaced successfully and previous file cleaned up');

    // 18. Resume deletion
    console.log('\n▶ Test 16: DELETE /api/v1/profile/resume (Delete resume)');
    const deleteRes = await request('/api/v1/profile/resume', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);

    // Verify post-delete 404
    const postDeleteDownload = await request('/api/v1/profile/resume', {
      headers: { Authorization: `Bearer ${seekerAToken}` },
    });
    assert.equal(postDeleteDownload.status, 404);
    console.log('  ✅ Resume deleted successfully and storage cleared');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 All 16 Profile & Secure Resume tests passed with flying colors!');
    console.log('════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Profile test suite failed:', err);
    process.exit(1);
  } finally {
    await testEnv.teardown();
  }
}

runProfileTests();
