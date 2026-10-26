import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    school: {
      type: String,
      trim: true,
      maxlength: [120, 'School name cannot exceed 120 characters'],
    },
    degree: {
      type: String,
      trim: true,
      maxlength: [100, 'Degree cannot exceed 100 characters'],
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: [100, 'Field of study cannot exceed 100 characters'],
    },
    startYear: {
      type: Number,
      min: 1950,
      max: 2100,
    },
    endYear: {
      type: Number,
      min: 1950,
      max: 2100,
    },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    startDate: {
      type: String,
      trim: true,
    },
    endDate: {
      type: String,
      trim: true,
    },
    current: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Experience description cannot exceed 2000 characters'],
    },
  },
  { _id: true }
);

const resumeMetadataSchema = new mongoose.Schema(
  {
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    sizeBytes: {
      type: Number,
      required: true,
      max: [5 * 1024 * 1024, 'Resume file size cannot exceed 5 MB'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [120, 'Headline cannot exceed 120 characters'],
      default: '',
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [2000, 'Professional summary cannot exceed 2000 characters'],
      default: '',
    },
    skills: {
      type: [String],
      default: [],
      set: (val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter((s) => s.length > 0 && s.length <= 50);
      },
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    portfolioLinks: {
      github: {
        type: String,
        trim: true,
        maxlength: [200, 'GitHub URL cannot exceed 200 characters'],
        default: '',
      },
      linkedin: {
        type: String,
        trim: true,
        maxlength: [200, 'LinkedIn URL cannot exceed 200 characters'],
        default: '',
      },
      portfolio: {
        type: String,
        trim: true,
        maxlength: [200, 'Portfolio URL cannot exceed 200 characters'],
        default: '',
      },
      website: {
        type: String,
        trim: true,
        maxlength: [200, 'Website URL cannot exceed 200 characters'],
        default: '',
      },
    },
    resume: {
      type: resumeMetadataSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Do not expose internal storageKey to public or untrusted callers if populated
        if (ret.resume) {
          ret.resume.hasResume = true;
          // Keep storageKey private from direct client consumption
          delete ret.resume.storageKey;
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
