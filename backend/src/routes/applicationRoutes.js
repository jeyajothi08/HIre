import express from 'express';
import {
  createApplication,
  getMyApplications,
  getEmployerApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Jobseeker application routes:
 * POST /api/v1/applications - apply to a job
 * GET /api/v1/applications/my - view submitted applications
 */
router.post('/', protect, authorize('jobseeker'), createApplication);
router.get('/my', protect, authorize('jobseeker'), getMyApplications);

import {
  getApplicationCandidateProfile,
  getApplicationCandidateResume,
} from '../controllers/profileController.js';

/**
 * Employer application routes:
 * GET /api/v1/applications/employer - view all applicants across employer's jobs
 * PATCH /api/v1/applications/:id/status - update review status of candidate
 * GET /api/v1/applications/:id/candidate-profile - view candidate profile (Owning Employer/Admin)
 * GET /api/v1/applications/:id/resume - securely download candidate resume (Owning Employer/Admin)
 */
router.get('/employer', protect, authorize('employer', 'admin'), getEmployerApplications);
router.patch('/:id/status', protect, authorize('employer', 'admin'), updateApplicationStatus);
router.get('/:id/candidate-profile', protect, authorize('employer', 'admin'), getApplicationCandidateProfile);
router.get('/:id/resume', protect, authorize('employer', 'admin'), getApplicationCandidateResume);

export default router;
