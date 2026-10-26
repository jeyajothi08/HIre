import mongoose from 'mongoose';

export const APPLICATION_STATUSES = ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'];

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant reference is required'],
      index: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a valid application status. Allowed: Pending, Reviewed, Shortlisted, Rejected, Hired',
      },
      default: 'Pending',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique compound index: An applicant can only apply once to a given job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// Performance indexes
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ job: 1, createdAt: -1 });
applicationSchema.index({ employer: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
