import { 
  X, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Building2, 
  Bookmark, 
  Share2, 
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';
import { getJobById, formatSalary, formatRelativeTime } from '../services/jobService';

export default function JobDetailsModal({ jobId, isOpen, onClose, isSaved, onToggleSave }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

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

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    setApplied(true);
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
              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm ${
                  applied 
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {applied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Application Submitted!</span>
                  </>
                ) : (
                  <>
                    <span>Apply Now</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
