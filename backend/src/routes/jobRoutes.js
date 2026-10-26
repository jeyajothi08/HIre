import express from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Public routes:
 * GET /api/v1/jobs - list jobs
 * GET /api/v1/jobs/:id - get single job
 *
 * Protected routes:
 * POST /api/v1/jobs - create job (Employers & Admins only)
 * PATCH /api/v1/jobs/:id - update job (Owner Employer or Admin)
 * DELETE /api/v1/jobs/:id - delete job (Owner Employer or Admin)
 */

router.route('/')
  .get(getJobs)
  .post(protect, authorize('employer', 'admin'), createJob);

router.route('/:id')
  .get(getJobById)
  .patch(protect, authorize('employer', 'admin'), updateJob)
  .delete(protect, authorize('employer', 'admin'), deleteJob);

export default router;
