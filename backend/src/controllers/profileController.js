import mongoose from 'mongoose';
import path from 'path';
import Profile from '../models/Profile.js';
import Application from '../models/Application.js';
import storageService from '../services/storageService.js';
import { getDBStatus } from '../config/db.js';

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
 * @desc   Get current authenticated jobseeker's profile
 * @route  GET /api/v1/profile/me
 * @access Private (Jobseeker only)
 */
export const getMyProfile = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    let profile = await Profile.findOne({ user: req.user._id }).populate('user', 'name email role createdAt');

    if (!profile) {
      // Create empty profile on-demand if none exists yet
      profile = await Profile.create({
        user: req.user._id,
        headline: '',
        summary: '',
        skills: [],
        education: [],
        experience: [],
        portfolioLinks: { github: '', linkedin: '', portfolio: '', website: '' },
      });
      profile = await profile.populate('user', 'name email role createdAt');
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update current authenticated jobseeker's profile
 * @route  PUT /api/v1/profile/me
 * @access Private (Jobseeker only)
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const {
      headline,
      summary,
      skills,
      education,
      experience,
      portfolioLinks,
    } = req.body || {};

    // Validate string lengths
    if (headline && typeof headline === 'string' && headline.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Headline cannot exceed 120 characters',
      });
    }

    if (summary && typeof summary === 'string' && summary.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Professional summary cannot exceed 2000 characters',
      });
    }

    // Sanitize skills
    let sanitizedSkills = [];
    if (Array.isArray(skills)) {
      sanitizedSkills = skills
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0 && s.length <= 50);
    }

    // Sanitize education
    let sanitizedEducation = [];
    if (Array.isArray(education)) {
      sanitizedEducation = education.map((edu) => ({
        school: typeof edu.school === 'string' ? edu.school.trim().slice(0, 120) : '',
        degree: typeof edu.degree === 'string' ? edu.degree.trim().slice(0, 100) : '',
        fieldOfStudy: typeof edu.fieldOfStudy === 'string' ? edu.fieldOfStudy.trim().slice(0, 100) : '',
        startYear: Number(edu.startYear) || undefined,
        endYear: Number(edu.endYear) || undefined,
      }));
    }

    // Sanitize experience
    let sanitizedExperience = [];
    if (Array.isArray(experience)) {
      sanitizedExperience = experience
        .filter((exp) => exp && exp.title && exp.company)
        .map((exp) => ({
          title: String(exp.title).trim().slice(0, 100),
          company: String(exp.company).trim().slice(0, 100),
          location: typeof exp.location === 'string' ? exp.location.trim().slice(0, 100) : '',
          startDate: typeof exp.startDate === 'string' ? exp.startDate.trim().slice(0, 30) : '',
          endDate: typeof exp.endDate === 'string' ? exp.endDate.trim().slice(0, 30) : '',
          current: Boolean(exp.current),
          description: typeof exp.description === 'string' ? exp.description.trim().slice(0, 2000) : '',
        }));
    }

    // Sanitize portfolio links
    const sanitizedLinks = {
      github: portfolioLinks?.github ? String(portfolioLinks.github).trim().slice(0, 200) : '',
      linkedin: portfolioLinks?.linkedin ? String(portfolioLinks.linkedin).trim().slice(0, 200) : '',
      portfolio: portfolioLinks?.portfolio ? String(portfolioLinks.portfolio).trim().slice(0, 200) : '',
      website: portfolioLinks?.website ? String(portfolioLinks.website).trim().slice(0, 200) : '',
    };

    let profile = await Profile.findOne({ user: req.user._id });

    if (!profile) {
      profile = new Profile({
        user: req.user._id,
      });
    }

    if (headline !== undefined) profile.headline = (headline || '').trim();
    if (summary !== undefined) profile.summary = (summary || '').trim();
    if (skills !== undefined) profile.skills = sanitizedSkills;
    if (education !== undefined) profile.education = sanitizedEducation;
    if (experience !== undefined) profile.experience = sanitizedExperience;
    if (portfolioLinks !== undefined) profile.portfolioLinks = sanitizedLinks;

    await profile.save();
    profile = await profile.populate('user', 'name email role createdAt');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
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
 * @desc   Upload or replace candidate resume PDF
 * @route  POST /api/v1/profile/resume
 * @access Private (Jobseeker only)
 */
export const uploadResume = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a PDF resume file.',
      });
    }

    const file = req.file;

    // 1. Strict extension validation
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format: Only PDF (.pdf) files are permitted for resumes.',
      });
    }

    // 2. Strict MIME type validation
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Invalid MIME type: File must be application/pdf.',
      });
    }

    // 3. Binary Magic Byte signature validation (%PDF-)
    const isValidSignature = storageService.validatePdfMagicBytes(file.buffer);
    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Security validation failed: File content does not match a valid PDF document signature.',
      });
    }

    // 4. File size check (5 MB maximum)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 5 MB maximum limit.',
      });
    }

    let profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new Profile({ user: req.user._id });
    }

    // 5. Cleanup replaced file if an existing resume is on record
    if (profile.resume && profile.resume.storageKey) {
      await storageService.deleteFile(profile.resume.storageKey);
    }

    // 6. Save new file to private storage
    const uploadResult = await storageService.uploadFile(file.buffer, file.originalname, file.mimetype);

    profile.resume = {
      storageKey: uploadResult.storageKey,
      originalName: uploadResult.originalName,
      mimeType: 'application/pdf',
      sizeBytes: uploadResult.sizeBytes,
      uploadedAt: uploadResult.uploadedAt,
    };

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        originalName: profile.resume.originalName,
        sizeBytes: profile.resume.sizeBytes,
        uploadedAt: profile.resume.uploadedAt,
        hasResume: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Download / stream authenticated jobseeker's own resume
 * @route  GET /api/v1/profile/resume
 * @access Private (Jobseeker only)
 */
export const downloadMyResume = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile || !profile.resume || !profile.resume.storageKey) {
      return res.status(404).json({
        success: false,
        message: 'No resume found on file. Please upload a PDF resume first.',
      });
    }

    const { stream, sizeBytes } = await storageService.getFile(profile.resume.storageKey);

    const safeFilename = encodeURIComponent(profile.resume.originalName || 'resume.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.pipe(res);
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Resume file could not be found in storage.',
      });
    }
    next(error);
  }
};

/**
 * @desc   Delete authenticated jobseeker's own resume
 * @route  DELETE /api/v1/profile/resume
 * @access Private (Jobseeker only)
 */
export const deleteMyResume = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const profile = await Profile.findOne({ user: req.user._id });

    if (!profile || !profile.resume || !profile.resume.storageKey) {
      return res.status(404).json({
        success: false,
        message: 'No resume found on file to delete.',
      });
    }

    // Clean up file in storage
    await storageService.deleteFile(profile.resume.storageKey);

    profile.resume = null;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   View applicant candidate profile for an application (Owning Employer or Admin)
 * @route  GET /api/v1/applications/:id/candidate-profile
 * @access Private (Owning Employer or Admin only)
 */
export const getApplicationCandidateProfile = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Application ID format',
      });
    }

    const application = await Application.findById(id).populate('job', 'createdBy title company');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Strict ownership verification: must be the employer assigned or job creator or admin
    const isOwner =
      (application.employer && req.user && application.employer.equals(req.user._id)) ||
      (application.job && application.job.createdBy && req.user && application.job.createdBy.equals(req.user._id));

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view candidate profile for this application.',
      });
    }

    let profile = await Profile.findOne({ user: application.applicant }).populate('user', 'name email createdAt');

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          headline: '',
          summary: '',
          skills: [],
          education: [],
          experience: [],
          portfolioLinks: {},
          resume: null,
          hasProfile: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...profile.toJSON(),
        hasProfile: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Securely download applicant resume for an application (Owning Employer or Admin)
 * @route  GET /api/v1/applications/:id/resume
 * @access Private (Owning Employer or Admin only)
 */
export const getApplicationCandidateResume = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Application ID format',
      });
    }

    const application = await Application.findById(id).populate('job', 'createdBy title company');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Strict ownership check
    const isOwner =
      (application.employer && req.user && application.employer.equals(req.user._id)) ||
      (application.job && application.job.createdBy && req.user && application.job.createdBy.equals(req.user._id));

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access candidate resume for this application.',
      });
    }

    const profile = await Profile.findOne({ user: application.applicant });

    if (!profile || !profile.resume || !profile.resume.storageKey) {
      return res.status(404).json({
        success: false,
        message: 'The applicant has not uploaded a resume for this profile.',
      });
    }

    const { stream, sizeBytes } = await storageService.getFile(profile.resume.storageKey);

    const safeFilename = encodeURIComponent(profile.resume.originalName || 'applicant-resume.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.pipe(res);
  } catch (error) {
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Candidate resume file could not be found in storage.',
      });
    }
    next(error);
  }
};
