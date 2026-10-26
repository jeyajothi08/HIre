import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Briefcase, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Eye, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { getMyApplications } from '../services/applicationService';
import { formatSalary, formatRelativeTime } from '../services/jobService';

const STATUS_CONFIG = {
  Pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
    label: 'Under Review',
  },
  Reviewed: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Eye,
    label: 'Profile Reviewed',
  },
  Shortlisted: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Star,
    label: 'Shortlisted',
  },
  Rejected: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
    label: 'Not Selected',
  },
  Hired: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    label: 'Offer Extended',
  },
};

export default function MyApplicationsModal({ isOpen, onClose, onSelectJob }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAppId, setExpandedAppId] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications();
      setApplications(res.data || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch your applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    getMyApplications()
      .then((res) => {
        if (isMounted) {
          setApplications(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to fetch your applications');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  const toggleExpand = (id) => {
    setExpandedAppId((prev) => (prev === id ? null : id));
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                My Job Applications
              </h2>
              <p className="text-xs text-slate-500">
                Track status updates and direct responses from hiring teams.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
              <p className="text-xs text-slate-500 font-medium">Loading your applications...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchApplications}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg text-[11px] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && applications.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No applications yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                You haven&apos;t applied to any engineering roles yet. Explore the live jobs feed to find your next opportunity.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                Browse Available Roles
              </button>
            </div>
          )}

          {!loading && !error && applications.length > 0 && (
            <div className="space-y-3">
              {applications.map((app) => {
                const statusMeta = STATUS_CONFIG[app.status] || STATUS_CONFIG.Pending;
                const StatusIcon = statusMeta.icon;
                const job = app.job || {};

                return (
                  <div
                    key={app._id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all shadow-subtle flex flex-col space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Job & Company */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {job.company || 'Unknown Company'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-400">
                            Applied {formatRelativeTime(app.createdAt)}
                          </span>
                        </div>

                        <h3 
                          onClick={() => {
                            if (job._id && onSelectJob) {
                              onClose();
                              onSelectJob(job._id);
                            }
                          }}
                          className={`text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 ${
                            job._id ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''
                          }`}
                        >
                          <span>{job.title || 'Job Posting Removed'}</span>
                          {job._id && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                          {job.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {job.location}
                            </span>
                          )}
                          {job.workplaceType && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                              {job.workplaceType}
                            </span>
                          )}
                          {(job.salaryMin != null || job.salaryMax != null) && (
                            <span className="font-semibold text-slate-800">
                              {formatSalary(job.salaryMin, job.salaryMax)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Pill */}
                      <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusMeta.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Cover Letter */}
                    {app.coverLetter && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleExpand(app._id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{expandedAppId === app._id ? 'Hide Cover Letter' : 'View Submitted Note'}</span>
                          {expandedAppId === app._id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {expandedAppId === app._id && (
                          <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
                            {app.coverLetter}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>{applications.length} submitted {applications.length === 1 ? 'application' : 'applications'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
