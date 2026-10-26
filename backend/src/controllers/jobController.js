import mongoose from 'mongoose';
import Job, { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from '../models/Job.js';
import { getDBStatus } from '../config/db.js';

/**
 * ⚠️ SECURITY & DEVELOPMENT NOTICE:
 * Authentication is NOT implemented in Phase 3.
 * The write endpoints (POST, PATCH, DELETE) are open for local development testing only.
 * In production, these routes MUST be guarded by authentication and role-based authorization
 * middleware (e.g., verifying verified Employer or Admin JWT tokens).
 */

/**
 * Helper to ensure MongoDB is ready before attempting query.
 * Prevents hanging queries or silent failures if the database is disconnected.
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
 * @desc   List jobs with optional search, filters, pagination, and sorting
 * @route  GET /api/v1/jobs
 * @access Public
 */
export const getJobs = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const {
      search,
      q,
      employmentType,
      workplaceType,
      location,
      skills,
      minSalary,
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // Keyword search (searches title, company, description, or skills)
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { company: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { skills: { $in: [new RegExp(searchTerm, 'i')] } },
      ];
    }

    // Employment type filter
    if (employmentType && EMPLOYMENT_TYPES.includes(employmentType)) {
      filter.employmentType = employmentType;
    }

    // Workplace type filter
    if (workplaceType && WORKPLACE_TYPES.includes(workplaceType)) {
      filter.workplaceType = workplaceType;
    }

    // Location filter
    if (location && location.trim()) {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }

    // Skills filter (can be comma-separated or single)
    if (skills) {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsArray.length > 0) {
        filter.skills = { $all: skillsArray.map((s) => new RegExp(`^${s}$`, 'i')) };
      }
    }

    // Minimum salary filter
    if (minSalary && !isNaN(Number(minSalary))) {
      filter.$or = [
        { salaryMax: { $gte: Number(minSalary) } },
        { salaryMin: { $gte: Number(minSalary) } },
      ];
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default newest
    if (sortBy === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sortBy === 'salaryHigh') {
      sortOption = { salaryMax: -1, salaryMin: -1 };
    } else if (sortBy === 'salaryLow') {
      sortOption = { salaryMin: 1, salaryMax: 1 };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Job.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get a single job by ID
 * @route  GET /api/v1/jobs/:id
 * @access Public
 */
export const getJobById = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    const job = await Job.findById(id).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create a new job posting
 * @route  POST /api/v1/jobs
 * @access Public (Dev Only - Must be protected before production)
 */
export const createJob = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const {
      title,
      company,
      location,
      employmentType,
      workplaceType,
      description,
      skills,
      salaryMin,
      salaryMax,
    } = req.body || {};

    // Validate required fields
    const missingFields = [];
    if (!title || !title.trim()) missingFields.push('title');
    if (!company || !company.trim()) missingFields.push('company');
    if (!location || !location.trim()) missingFields.push('location');
    if (!description || !description.trim()) missingFields.push('description');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(', ')}`,
      });
    }

    // Validate enum values if provided
    if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid employmentType. Allowed values: ${EMPLOYMENT_TYPES.join(', ')}`,
      });
    }

    if (workplaceType && !WORKPLACE_TYPES.includes(workplaceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid workplaceType. Allowed values: ${WORKPLACE_TYPES.join(', ')}`,
      });
    }

    // Validate salary relation
    if (
      salaryMin !== undefined &&
      salaryMax !== undefined &&
      salaryMin !== null &&
      salaryMax !== null &&
      Number(salaryMax) < Number(salaryMin)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum salary cannot be less than minimum salary',
      });
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      employmentType: employmentType || 'Full-time',
      workplaceType: workplaceType || 'Remote',
      description: description.trim(),
      skills: Array.isArray(skills) ? skills : [],
      salaryMin: salaryMin != null && !isNaN(Number(salaryMin)) ? Number(salaryMin) : null,
      salaryMax: salaryMax != null && !isNaN(Number(salaryMax)) ? Number(salaryMax) : null,
      createdBy: req.user ? req.user._id : null,
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
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

/**
 * @desc   Update an existing job posting
 * @route  PATCH /api/v1/jobs/:id
 * @access Private (Employer owner or Admin only)
 */
export const updateJob = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    const existingJob = await Job.findById(id);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Ownership check: only the employer who created the job or an admin can update it
    if (
      existingJob.createdBy &&
      req.user &&
      !existingJob.createdBy.equals(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this job posting.',
      });
    }

    const updates = req.body || {};

    // Validate enums if provided in update
    if (updates.employmentType && !EMPLOYMENT_TYPES.includes(updates.employmentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid employmentType. Allowed values: ${EMPLOYMENT_TYPES.join(', ')}`,
      });
    }

    if (updates.workplaceType && !WORKPLACE_TYPES.includes(updates.workplaceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid workplaceType. Allowed values: ${WORKPLACE_TYPES.join(', ')}`,
      });
    }

    // Validate updated salary relationship
    const finalMin = updates.salaryMin !== undefined ? updates.salaryMin : existingJob.salaryMin;
    const finalMax = updates.salaryMax !== undefined ? updates.salaryMax : existingJob.salaryMax;

    if (
      finalMin !== null &&
      finalMax !== null &&
      finalMin !== undefined &&
      finalMax !== undefined &&
      Number(finalMax) < Number(finalMin)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum salary cannot be less than minimum salary',
      });
    }

    const updatedJob = await Job.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob,
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

/**
 * @desc   Delete a job posting
 * @route  DELETE /api/v1/jobs/:id
 * @access Private (Employer owner or Admin only)
 */
export const deleteJob = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Job ID format',
      });
    }

    const existingJob = await Job.findById(id);

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Ownership check: only the employer who created the job or an admin can delete it
    if (
      existingJob.createdBy &&
      req.user &&
      !existingJob.createdBy.equals(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this job posting.',
      });
    }

    const deletedJob = await Job.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
      data: { id: deletedJob._id, title: deletedJob.title },
    });
  } catch (error) {
    next(error);
  }
};
