import express from 'express';
import multer from 'multer';
import {
  getMyProfile,
  updateMyProfile,
  uploadResume,
  downloadMyResume,
  deleteMyResume,
} from '../controllers/profileController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer with in-memory buffer and 5 MB ceiling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
});

// Middleware to handle Multer upload errors gracefully (e.g. LIMIT_FILE_SIZE)
const handleUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 5 MB maximum limit.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }
    next();
  });
};

/**
 * Candidate Profile Routes:
 * GET /api/v1/profile/me - Get current jobseeker profile
 * PUT /api/v1/profile/me - Update current jobseeker profile
 */
router.route('/me')
  .get(protect, authorize('jobseeker'), getMyProfile)
  .put(protect, authorize('jobseeker'), updateMyProfile);

/**
 * Candidate Resume Routes:
 * POST /api/v1/profile/resume - Upload/replace PDF resume
 * GET /api/v1/profile/resume - Download own resume
 * DELETE /api/v1/profile/resume - Delete own resume
 */
router.route('/resume')
  .post(protect, authorize('jobseeker'), handleUpload, uploadResume)
  .get(protect, authorize('jobseeker'), downloadMyResume)
  .delete(protect, authorize('jobseeker'), deleteMyResume);

export default router;
