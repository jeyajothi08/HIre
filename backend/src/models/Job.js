import mongoose from 'mongoose';

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
export const WORKPLACE_TYPES = ['Remote', 'Hybrid', 'On-site'];

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [2, 'Job title must be at least 2 characters'],
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [1, 'Company name must be at least 1 character'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [1, 'Location must be at least 1 character'],
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    employmentType: {
      type: String,
      required: [true, 'Employment type is required'],
      enum: {
        values: EMPLOYMENT_TYPES,
        message: '{VALUE} is not a valid employment type. Allowed: Full-time, Part-time, Contract, Internship',
      },
      default: 'Full-time',
    },
    workplaceType: {
      type: String,
      required: [true, 'Workplace type is required'],
      enum: {
        values: WORKPLACE_TYPES,
        message: '{VALUE} is not a valid workplace type. Allowed: Remote, Hybrid, On-site',
      },
      default: 'Remote',
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [10, 'Job description must be at least 10 characters'],
    },
    skills: {
      type: [String],
      default: [],
      set: (val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter((s) => s.length > 0);
      },
    },
    salaryMin: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative'],
      default: null,
    },
    salaryMax: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative'],
      default: null,
      validate: {
        validator: function (val) {
          // If both salaryMin and salaryMax are provided, salaryMax must be >= salaryMin
          if (val != null && this.salaryMin != null) {
            return val >= this.salaryMin;
          }
          return true;
        },
        message: 'Maximum salary cannot be less than minimum salary',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for query optimization
jobSchema.index({ createdAt: -1 });
jobSchema.index({ employmentType: 1, workplaceType: 1 });
jobSchema.index({
  title: 'text',
  company: 'text',
  description: 'text',
  skills: 'text',
});

const Job = mongoose.model('Job', jobSchema);

export default Job;
