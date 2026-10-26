import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Building2, 
  Bookmark, 
  Share2, 
  Check, 
  AlertCircle,
  Loader2,
  FileText,
  Send,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getJobById, formatSalary, formatRelativeTime } from '../services/jobService';
import { applyForJob } from '../services/applicationService';

export default function JobDetailsModal({ 
  jobId, 
  isOpen, 
  onClose, 
  isSaved, 
  onToggleSave,
  user,
  onOpenAuthModal,
  appliedJobIds,
  onJobApplied,
  onOpenCandidateProfile
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Application submission states
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterBox, setShowCoverLetterBox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appError, setAppError] = useState(null);
  const [appSuccess, setAppSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    let isMounted = true;

    getJobById(jobId)
      .then((res) => {
        if (isMounted) {
          setJob(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to load job details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAlreadyApplied = Boolean(
    appSuccess || (appliedJobIds && jobId && appliedJobIds.has(jobId))
  );

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplySubmit = async (e) => {
    if (e) e.preventDefault();

    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    if (user.role === 'employer') {
      return;
    }

    if (isAlreadyApplied || submitting) return;

    setSubmitting(true);
    setAppError(null);

    try {
      const res = await applyForJob({
        jobId,
        coverLetter: coverLetter.trim() || undefined
      });
      setAppSuccess(true);
      if (onJobApplied) {
        onJobApplied(res.data);
      }
    } catch (err) {
      setAppError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Actions */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Verified Hiring Partner</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Share job link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Fetching job details from HireHub API...</p>
            </div>
          )}

          {error && (
            <div className="py-12 px-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">Could not load job details</h4>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  getJobById(jobId)
                    .then((res) => { setJob(res.data); setLoading(false); })
                    .catch((err) => { setError(err.message); setLoading(false); });
                }}
                className="mt-4 px-4 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && job && (
            <>
              {/* Job Title & Company */}
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
                  {job.company ? job.company.charAt(0) : 'H'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{job.company}</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">{job.title}</h2>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {job.employmentType}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-semibold">
                      {job.workplaceType}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-bold">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Meta Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Compensation</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Workplace</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{job.workplaceType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Posted</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{formatRelativeTime(job.createdAt)}</span>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Role Description</h3>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white rounded-lg">
                  {job.description}
                </div>
              </div>

              {/* Skills & Technologies */}
              {job.skills && job.skills.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Skills & Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <span 
                        key={skill}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Application Form Section (Jobseeker only, not applied) */}
              {user && user.role === 'jobseeker' && !isAlreadyApplied && (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCoverLetterBox(!showCoverLetterBox)}
                      className="text-xs font-semibold text-slate-800 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>{showCoverLetterBox ? 'Hide Cover Note' : 'Add a Cover Note / Message (Optional)'}</span>
                      {showCoverLetterBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {coverLetter.length}/2000
                    </span>
                  </div>

                  {showCoverLetterBox && (
                    <div className="pt-1 space-y-2 animate-in fade-in duration-150">
                      <textarea
                        rows={4}
                        maxLength={2000}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Highlight your background, relevant tech stack experience, or portfolio links..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all resize-y"
                      />
                      <p className="text-[11px] text-slate-500">
                        Submitted as <strong className="text-slate-700">{user.name}</strong> ({user.email}).
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Candidate profile and resume (if uploaded) are included with your submission.</span>
                    {onOpenCandidateProfile && (
                      <button
                        type="button"
                        onClick={onOpenCandidateProfile}
                        className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 ml-2 shrink-0"
                      >
                        Manage Profile & Resume
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Employer Notice */}
              {user && user.role === 'employer' && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold block">Employer Account Notice</span>
                    <span className="text-amber-800/90 mt-0.5 block leading-relaxed">
                      You are signed in with an Employer account. Application submissions are reserved for Job Seekers.
                    </span>
                  </div>
                </div>
              )}

              {/* Success Badge */}
              {isAlreadyApplied && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-3">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Application Submitted Successfully</span>
                    <span className="text-emerald-800 mt-0.5 block leading-relaxed">
                      Your application has been delivered to the hiring team. You can monitor review progress anytime under your &quot;My Applications&quot; dashboard.
                    </span>
                  </div>
                </div>
              )}

              {/* Submission Error Banner */}
              {appError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{appError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppError(null)}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* SLA Guarantee Box */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start space-x-3">
                <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block">HireHub Response Guarantee</span>
                  <span className="text-blue-700/90 mt-0.5 block leading-relaxed">
                    This employer has committed to a verified review timeline. You will hear back directly from the hiring manager within 7 business days.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!loading && !error && job && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <button
              onClick={() => onToggleSave && onToggleSave(job._id)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-colors ${
                isSaved
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
              <span>{isSaved ? 'Saved Role' : 'Save for Later'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {!user ? (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign in to Apply</span>
                </button>
              ) : user.role === 'employer' ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                >
                  Employers Cannot Apply
                </button>
              ) : isAlreadyApplied ? (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 bg-emerald-600 text-white cursor-default shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Applied • Under Review</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplySubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
