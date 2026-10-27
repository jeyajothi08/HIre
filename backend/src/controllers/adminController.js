import mongoose from 'mongoose';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import { createNotification } from '../services/notificationService.js';
import { getDBStatus } from '../config/db.js';

/**
 * Helper to ensure MongoDB is connected.
 */
const ensureDatabaseReady = (res) => {
  const dbStatus = getDBStatus();
  if (dbStatus.status !== 'connected') {
    res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable.',
      databaseStatus: dbStatus.status,
    });
    return false;
  }
  return true;
};

/**
 * @desc   Get server-derived platform metrics and recent activity
 * @route  GET /api/v1/admin/metrics
 * @access Private (Admin only)
 */
export const getAdminMetrics = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const [
      totalUsers,
      totalJobseekers,
      totalEmployers,
      totalJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
      totalApplications,
      recentUsers,
      recentJobs,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'jobseeker' }),
      User.countDocuments({ role: 'employer' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'pending' }),
      Job.countDocuments({ status: { $in: ['approved', null] } }),
      Job.countDocuments({ status: 'rejected' }),
      Application.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
      Job.find().sort({ createdAt: -1 }).limit(5).select('title company status isActive createdAt').lean(),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('job', 'title company')
        .populate('applicant', 'name')
        .select('status createdAt')
        .lean(),
    ]);

    // Aggregate recent activity feed
    const activityFeed = [
      ...recentUsers.map((u) => ({
        type: 'user_registered',
        title: `New ${u.role === 'employer' ? 'Employer' : 'Jobseeker'} Registered`,
        description: `${u.name} (${u.email}) joined HireHub.`,
        timestamp: u.createdAt,
      })),
      ...recentJobs.map((j) => ({
        type: 'job_posted',
        title: `Job Posted: ${j.title}`,
        description: `${j.company} posted a new position (Status: ${j.status || 'approved'}).`,
        timestamp: j.createdAt,
      })),
      ...recentApplications.map((a) => ({
        type: 'application_submitted',
        title: `Application for ${a.job?.title || 'Job'}`,
        description: `${a.applicant?.name || 'Applicant'} applied to ${a.job?.company || 'Company'}.`,
        timestamp: a.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalJobseekers,
        totalEmployers,
        totalJobs,
        pendingJobs,
        approvedJobs,
        rejectedJobs,
        totalApplications,
        recentActivity: activityFeed,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all jobs with pagination and moderation status filters
 * @route  GET /api/v1/admin/jobs
 * @access Private (Admin only)
 */
export const getAdminJobs = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, isActive, search } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (isActive !== undefined && isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('createdBy', 'name email role')
        .populate('moderatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Moderate a job (Approve or Reject with reason)
 * @route  PATCH /api/v1/admin/jobs/:id/moderate
 * @access Private (Admin only)
 */
export const moderateJob = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;
    const { status, rejectionReason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid moderation status. Must be either "approved" or "rejected".',
      });
    }

    if (status === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim() || rejectionReason.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A rejection reason of at least 3 characters is required when rejecting a job posting.',
        });
      }
    }

    const job = await Job.findById(id).populate('createdBy', 'name email');
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    job.status = status;
    job.rejectionReason = status === 'rejected' ? rejectionReason.trim() : null;
    job.moderatedBy = req.user._id;
    job.moderatedAt = new Date();

    await job.save();

    // Send in-app notification to the job owner
    if (job.createdBy?._id) {
      const isApproved = status === 'approved';
      const notifTitle = isApproved ? 'Job Posting Approved' : 'Job Posting Rejected';
      const notifMsg = isApproved
        ? `Your job posting "${job.title}" has been approved by the moderation team and is now live in public search.`
        : `Your job posting "${job.title}" was rejected. Reason: ${rejectionReason.trim()}`;

      createNotification({
        recipient: job.createdBy._id,
        type: 'system',
        title: notifTitle,
        message: notifMsg,
        job: job._id,
        idempotencyKey: `mod_${job._id}_${status}_${Date.now()}`,
        recipientEmail: job.createdBy.email || null,
      }).catch((notifErr) => {
        console.warn('[AdminController] Notification to employer failed:', notifErr.message);
      });
    }

    res.status(200).json({
      success: true,
      message: `Job posting successfully ${status}.`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Toggle job active state (Safe deactivation of published jobs)
 * @route  PATCH /api/v1/admin/jobs/:id/toggle-active
 * @access Private (Admin only)
 */
export const toggleJobActive = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;
    const { isActive } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean (true or false).',
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    job.isActive = isActive;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job posting ${isActive ? 'reactivated' : 'deactivated'} successfully.`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get paginated user list with role filters and search
 * @route  GET /api/v1/admin/users
 * @access Private (Admin only)
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { role, search } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
