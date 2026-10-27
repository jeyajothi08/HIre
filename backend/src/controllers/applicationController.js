import mongoose from 'mongoose';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { createNotification } from '../services/notificationService.js';
import { getDBStatus } from '../config/db.js';

/**
 * Helper to ensure MongoDB is connected before running operations.
 */
const ensureDatabaseReady = (res) => {
  const dbStatus = getDBStatus();
  if (dbStatus.status !== 'connected') {
    res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable.',
      databaseStatus: dbStatus.status,
      errorCategory: dbStatus.errorCategory,
      troubleshooting: dbStatus.troubleshooting,
    });
    return false;
  }
  return true;
};

/**
 * @desc   Apply to a job posting
 * @route  POST /api/v1/applications
 * @access Private (Jobseeker only)
 */
export const createApplication = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    // Strict role check: employers cannot apply for jobs
    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only jobseekers are permitted to apply for positions. Your current role is '${req.user.role}'.`,
      });
    }

    const { jobId, coverLetter } = req.body || {};

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'jobId is required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    // Find job posting
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    // Prevent duplicate application
    const existing = await Application.findOne({
      job: jobId,
      applicant: req.user._id,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an application for this position.',
        data: { existingApplicationId: existing._id, status: existing.status },
      });
    }

    // Determine employer owner from job posting (do not fall back to applicant)
    const employerId = job.createdBy || null;

    // Validate cover letter length
    const trimmedCoverLetter = (coverLetter || '').trim();
    if (trimmedCoverLetter.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Cover letter cannot exceed 2000 characters',
      });
    }

    const application = await Application.create({
      job: job._id,
      applicant: req.user._id,
      employer: employerId,
      coverLetter: trimmedCoverLetter,
      status: 'Pending',
    });

    // Notify the employer who posted the job (non-blocking)
    if (employerId) {
      User.findById(employerId).select('email').lean()
        .then((employerUser) => {
          return createNotification({
            recipient: employerId,
            type: 'new_application',
            title: `New Application for ${job.title}`,
            message: `${req.user.name} applied for "${job.title}".`,
            job: job._id,
            application: application._id,
            idempotencyKey: `new_app_${application._id}`,
            recipientEmail: employerUser?.email || null,
          });
        })
        .catch((notifErr) => {
          console.warn('[ApplicationController] Failed to dispatch employer notification:', notifErr.message);
        });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an application for this position.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    next(error);
  }
};

/**
 * @desc   Get applications submitted by the current jobseeker
 * @route  GET /api/v1/applications/my
 * @access Private (Jobseeker only)
 */
export const getMyApplications = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    if (req.user.role !== 'jobseeker') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only jobseekers can view their submitted applications.',
      });
    }

    const applications = await Application.find({ applicant: req.user._id })
      .populate('job', 'title company location employmentType workplaceType salaryMin salaryMax')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all applicants for a specific job posting (Owning Employer or Admin)
 * @route  GET /api/v1/jobs/:jobId/applications
 * @access Private (Owning Employer or Admin only)
 */
export const getJobApplications = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    // Ownership check: only the employer who created the job or an admin can view applicants
    const isOwner = job.createdBy && req.user && job.createdBy.equals(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view applicants for this job posting.',
      });
    }

    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const enrichedApplications = await attachResumeMetadata(applications);

    res.status(200).json({
      success: true,
      count: enrichedApplications.length,
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
      },
      data: enrichedApplications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safely attach resume presence flags from candidate profile without altering ownership or authorization.
 */
const attachResumeMetadata = async (applications) => {
  if (!Array.isArray(applications) || applications.length === 0) return applications;

  const applicantIds = applications
    .map((app) => app.applicant?._id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  if (applicantIds.length === 0) return applications;

  const profiles = await Profile.find({ user: { $in: applicantIds } })
    .select('user resume.storageKey resume.originalName')
    .lean();
  const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

  return applications.map((app) => {
    const prof = app.applicant?._id ? profileMap.get(app.applicant._id.toString()) : null;
    const hasResume = Boolean(prof?.resume?.storageKey);
    return {
      ...app,
      hasResume,
      resumeOriginalName: hasResume ? (prof.resume.originalName || 'resume.pdf') : null,
    };
  });
};

/**
 * @desc   Get all applicants across all jobs posted by the authenticated employer
 * @route  GET /api/v1/applications/employer
 * @access Private (Employer or Admin only)
 */
export const getEmployerApplications = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    let filter = {};
    if (req.user.role !== 'admin') {
      const employerJobs = await Job.find({ createdBy: req.user._id }).select('_id');
      const employerJobIds = employerJobs.map((j) => j._id);
      filter = {
        $or: [
          { employer: req.user._id },
          { job: { $in: employerJobIds } },
        ],
      };
    }

    const applications = await Application.find(filter)
      .populate('job', 'title company location employmentType workplaceType salaryMin salaryMax')
      .populate('applicant', 'name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const enrichedApplications = await attachResumeMetadata(applications);

    res.status(200).json({
      success: true,
      count: enrichedApplications.length,
      data: enrichedApplications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update application review status (Owning Employer or Admin only)
 * @route  PATCH /api/v1/applications/:id/status
 * @access Private (Owning Employer or Admin only)
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Application ID format',
      });
    }

    if (!status || !APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: '${status}'. Allowed values: ${APPLICATION_STATUSES.join(', ')}`,
      });
    }

    const application = await Application.findById(id)
      .populate('job', 'createdBy title')
      .populate('applicant', 'name email');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Ownership check: must be the employer assigned to the application or owner of the job or admin
    const isOwner =
      (application.employer && req.user && application.employer.equals(req.user._id)) ||
      (application.job && application.job.createdBy && req.user && application.job.createdBy.equals(req.user._id));

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to update the status of this application.',
      });
    }

    application.status = status;
    await application.save();

    // Notify the applicant jobseeker of the status change (non-blocking)
    const applicantId = application.applicant?._id || application.applicant;
    const applicantEmail = application.applicant?.email || null;
    const jobTitle = application.job?.title || 'Job';

    if (applicantId) {
      createNotification({
        recipient: applicantId,
        type: 'status_update',
        title: `Application Status: ${status}`,
        message: `Your application for "${jobTitle}" has been updated to "${status}".`,
        job: application.job?._id || application.job,
        application: application._id,
        idempotencyKey: `status_${application._id}_${status}`,
        recipientEmail: applicantEmail,
      }).catch((notifErr) => {
        console.warn('[ApplicationController] Failed to dispatch status notification:', notifErr.message);
      });
    }

    res.status(200).json({
      success: true,
      message: `Application status updated to '${status}'`,
      data: application,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }
    next(error);
  }
};
