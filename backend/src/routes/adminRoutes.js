import express from 'express';
import {
  getAdminMetrics,
  getAdminJobs,
  moderateJob,
  toggleJobActive,
  getAdminUsers,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict Admin-only Guard: Authentication + Admin Role enforcement
router.use(protect);
router.use(authorize('admin'));

router.get('/metrics', getAdminMetrics);
router.get('/jobs', getAdminJobs);
router.patch('/jobs/:id/moderate', moderateJob);
router.patch('/jobs/:id/toggle-active', toggleJobActive);
router.get('/users', getAdminUsers);

export default router;
