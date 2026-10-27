import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Users, 
  Mail, 
  Briefcase, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Download,
  User,
  ExternalLink
} from 'lucide-react';
import { getEmployerApplications, updateApplicationStatus } from '../services/applicationService';
import { downloadApplicationResume, getApplicationCandidateProfile } from '../services/profileService';
import { formatRelativeTime } from '../services/jobService';

const STATUS_OPTIONS = ['Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'];

const STATUS_BADGE_STYLES = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  Shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function EmployerApplicantsModal({ isOpen, onClose }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [candidateProfileModal, setCandidateProfileModal] = useState(null);
  const [loadingProfileId, setLoadingProfileId] = useState(null);
  const [resumeActionError, setResumeActionError] = useState(null);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResumeActionError(null);
    try {
      const res = await getEmployerApplications();
      setApplications(res.data || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch candidate applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    getEmployerApplications()
      .then((res) => {
        if (isMounted) {
          setApplications(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to fetch candidate applications');
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

  // Handle status update
  const handleStatusChange = async (appId, newStatus) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      setResumeActionError({
        appId,
        message: err.message || 'Failed to update candidate status',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Download candidate resume securely
  const handleDownloadResume = async (appId, applicantName) => {
    setResumeActionError(null);
    setDownloadingResumeId(appId);
    try {
      await downloadApplicationResume(appId, applicantName);
    } catch (err) {
      setResumeActionError({
        appId,
        message: err.message || 'The applicant has not uploaded a resume.',
      });
    } finally {
      setDownloadingResumeId(null);
    }
  };

  // View candidate profile details
  const handleViewProfile = async (appId, applicantName) => {
    setResumeActionError(null);
    setLoadingProfileId(appId);
    try {
      const res = await getApplicationCandidateProfile(appId);
      setCandidateProfileModal({
        applicantName,
        profile: res.data || {},
      });
    } catch (err) {
      setResumeActionError({
        appId,
        message: err.message || 'Unable to fetch candidate profile',
      });
    } finally {
      setLoadingProfileId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedAppId((prev) => (prev === id ? null : id));
  };

  if (!isOpen) return null;

  // Distinct job titles for filter dropdown
  const uniqueJobs = Array.from(
    new Set(applications.map((app) => app.job?.title).filter(Boolean))
  );

  const filteredApplications = applications.filter((app) => {
    if (selectedJobFilter === 'ALL') return true;
    return app.job?.title === selectedJobFilter;
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Candidate Pipeline & Applicants
              </h2>
              <p className="text-xs text-slate-500">
                Review verified technical applicants across your job postings.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter by Job */}
            {uniqueJobs.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Postings ({applications.length})</option>
                  {uniqueJobs.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
              <p className="text-xs text-slate-500 font-medium">Loading candidate applications...</p>
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
                onClick={fetchApplicants}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg text-[11px] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredApplications.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No applicants yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Candidates applying for your posted engineering positions will appear here in real time.
              </p>
            </div>
          )}

          {!loading && !error && filteredApplications.length > 0 && (
            <div className="space-y-3">
              {filteredApplications.map((app) => {
                const applicant = app.applicant || {};
                const job = app.job || {};
                const isUpdating = updatingId === app._id;
                const badgeStyle = STATUS_BADGE_STYLES[app.status] || STATUS_BADGE_STYLES.Pending;

                return (
                  <div
                    key={app._id}
                    className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white hover:border-slate-300 transition-all shadow-subtle flex flex-col space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Applicant details */}
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                          {applicant.name ? applicant.name.charAt(0) : 'A'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-slate-900">{applicant.name || 'Candidate'}</h3>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-400">{formatRelativeTime(app.createdAt)}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{applicant.email}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-1.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>Applied for: <strong>{job.title || 'Job Posting'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Dropdown & Badge */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2.5">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-slate-500 font-medium">Status:</label>
                          <div className="relative">
                            <select
                              value={app.status}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(app._id, e.target.value)}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border appearance-none pr-7 cursor-pointer focus:outline-none transition-all ${badgeStyle}`}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {isUpdating && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        )}
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
                          <span>{expandedAppId === app._id ? 'Hide Candidate Note' : 'Read Candidate Note'}</span>
                          {expandedAppId === app._id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {expandedAppId === app._id && (
                          <div className="mt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
                            {app.coverLetter}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Candidate Actions: Profile & Resume */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewProfile(app._id, applicant.name || 'Candidate')}
                            disabled={loadingProfileId === app._id}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                          >
                            {loadingProfileId === app._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>View Candidate Profile</span>
                          </button>

                          {app.hasResume === false ? (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium flex items-center gap-1.5 border border-slate-200 cursor-not-allowed"
                              title="The applicant has not uploaded a resume for this profile"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>No Resume Uploaded</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDownloadResume(app._id, applicant.name || 'Candidate')}
                              disabled={downloadingResumeId === app._id}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60"
                            >
                              {downloadingResumeId === app._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-blue-400" />
                              )}
                              <span>Download Resume (PDF)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {resumeActionError && resumeActionError.appId === app._id && (
                        <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>{resumeActionError.message}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResumeActionError(null)}
                            className="text-amber-500 hover:text-amber-800 p-0.5 rounded transition-colors"
                            aria-label="Dismiss message"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>{filteredApplications.length} candidate {filteredApplications.length === 1 ? 'applicant' : 'applicants'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded Candidate Profile Inspector Modal */}
      {candidateProfileModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-4"
          onClick={() => setCandidateProfileModal(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {candidateProfileModal.applicantName}&apos;s Profile
                  </h3>
                  <p className="text-[11px] text-slate-500">Verified Technical Candidate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidateProfileModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {candidateProfileModal.profile.headline && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Headline
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {candidateProfileModal.profile.headline}
                  </p>
                </div>
              )}

              {candidateProfileModal.profile.summary && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Professional Summary
                  </span>
                  <p className="text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                    {candidateProfileModal.profile.summary}
                  </p>
                </div>
              )}

              {candidateProfileModal.profile.skills && candidateProfileModal.profile.skills.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Skills & Tech Stack
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidateProfileModal.profile.skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium border border-slate-200/60">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {candidateProfileModal.profile.experience && candidateProfileModal.profile.experience.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Experience
                  </span>
                  {candidateProfileModal.profile.experience.map((exp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{exp.title}</span>
                        <span className="text-slate-400 text-[10px]">{exp.startDate} - {exp.endDate || 'Present'}</span>
                      </div>
                      <p className="text-slate-600 font-medium">{exp.company} {exp.location ? `• ${exp.location}` : ''}</p>
                      {exp.description && <p className="text-slate-500 mt-1">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {candidateProfileModal.profile.education && candidateProfileModal.profile.education.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Education
                  </span>
                  {candidateProfileModal.profile.education.map((edu, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="font-bold text-slate-900 block">{edu.school}</span>
                      <span className="text-slate-600">{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {candidateProfileModal.profile.portfolioLinks && Object.values(candidateProfileModal.profile.portfolioLinks).some(Boolean) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Portfolio & Profiles
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {candidateProfileModal.profile.portfolioLinks.github && (
                      <a href={candidateProfileModal.profile.portfolioLinks.github} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg border border-slate-200 text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {candidateProfileModal.profile.portfolioLinks.linkedin && (
                      <a href={candidateProfileModal.profile.portfolioLinks.linkedin} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg border border-slate-200 text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        <span>LinkedIn</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {candidateProfileModal.profile.portfolioLinks.portfolio && (
                      <a href={candidateProfileModal.profile.portfolioLinks.portfolio} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg border border-slate-200 text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        <span>Portfolio</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
              <button
                type="button"
                onClick={() => setCandidateProfileModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
