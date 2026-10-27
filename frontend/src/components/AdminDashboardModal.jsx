import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Briefcase,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import {
  getAdminMetrics,
  getAdminJobs,
  moderateJob,
  toggleJobActive,
  getAdminUsers,
} from '../services/adminService';
import { formatRelativeTime } from '../services/jobService';

export default function AdminDashboardModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'jobs' | 'users'
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  // Job Moderation States
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);
  const [jobsTotalCount, setJobsTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'true' | 'false'
  const [jobSearch, setJobSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject Modal prompt
  const [rejectModalJob, setRejectModalJob] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState(null);

  // User Management States
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Global action banner
  const [actionSuccess, setActionSuccess] = useState(null);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await getAdminMetrics();
      setMetrics(res.data);
    } catch (err) {
      setMetricsError(err.message || 'Failed to load platform metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Load jobs queue
  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await getAdminJobs({
        page: jobsPage,
        limit: 10,
        status: statusFilter,
        isActive: activeFilter,
        search: jobSearch,
      });
      setJobs(res.data || []);
      setJobsTotalPages(res.totalPages || 1);
      setJobsTotalCount(res.total || 0);
    } catch (err) {
      setJobsError(err.message || 'Failed to load jobs queue');
    } finally {
      setJobsLoading(false);
    }
  }, [jobsPage, statusFilter, activeFilter, jobSearch]);

  // Load users list
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await getAdminUsers({
        page: usersPage,
        limit: 10,
        role: userRoleFilter,
        search: userSearch,
      });
      setUsers(res.data || []);
      setUsersTotalPages(res.totalPages || 1);
      setUsersTotalCount(res.total || 0);
    } catch (err) {
      setUsersError(err.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, userRoleFilter, userSearch]);

  // Load appropriate data on tab change or mount
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    if (activeTab === 'overview') {
      getAdminMetrics()
        .then((res) => {
          if (!active) return;
          setMetrics(res.data);
          setMetricsError(null);
        })
        .catch((err) => {
          if (!active) return;
          setMetricsError(err.message || 'Failed to load platform metrics');
        })
        .finally(() => {
          if (active) setMetricsLoading(false);
        });
    }

    if (activeTab === 'jobs') {
      getAdminJobs({
        page: jobsPage,
        limit: 10,
        status: statusFilter,
        isActive: activeFilter,
        search: jobSearch,
      })
        .then((res) => {
          if (!active) return;
          setJobs(res.data || []);
          setJobsTotalPages(res.totalPages || 1);
          setJobsTotalCount(res.total || 0);
          setJobsError(null);
        })
        .catch((err) => {
          if (!active) return;
          setJobsError(err.message || 'Failed to load jobs queue');
        })
        .finally(() => {
          if (active) setJobsLoading(false);
        });
    }

    if (activeTab === 'users') {
      getAdminUsers({
        page: usersPage,
        limit: 10,
        role: userRoleFilter,
        search: userSearch,
      })
        .then((res) => {
          if (!active) return;
          setUsers(res.data || []);
          setUsersTotalPages(res.totalPages || 1);
          setUsersTotalCount(res.total || 0);
          setUsersError(null);
        })
        .catch((err) => {
          if (!active) return;
          setUsersError(err.message || 'Failed to load users');
        })
        .finally(() => {
          if (active) setUsersLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, activeTab, jobsPage, statusFilter, activeFilter, jobSearch, usersPage, userRoleFilter, userSearch]);

  // Escape key handler
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

  // Handle Approve
  const handleApprove = async (job) => {
    setActionLoadingId(job._id);
    try {
      await moderateJob(job._id, 'approved');
      setActionSuccess(`Job "${job.title}" has been approved and published to public search.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadJobs();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (job) => {
    setRejectModalJob(job);
    setRejectReason('');
    setRejectError(null);
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setRejectError('Please provide a specific rejection reason (at least 3 characters).');
      return;
    }

    setActionLoadingId(rejectModalJob._id);
    try {
      await moderateJob(rejectModalJob._id, 'rejected', rejectReason.trim());
      setActionSuccess(`Job "${rejectModalJob.title}" has been rejected.`);
      setTimeout(() => setActionSuccess(null), 3500);
      setRejectModalJob(null);
      loadJobs();
    } catch (err) {
      setRejectError(err.message || 'Rejection failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle active/deactive
  const handleToggleActive = async (job) => {
    const nextState = !job.isActive;
    setActionLoadingId(job._id);
    try {
      await toggleJobActive(job._id, nextState);
      setActionSuccess(`Job "${job.title}" is now ${nextState ? 'Active' : 'Deactivated'}.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadJobs();
    } catch (err) {
      alert(err.message || 'Toggle failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <ShieldCheck className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Admin Dashboard & Moderation Console
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800">
                  Staff Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Platform-wide analytics, job moderation pipeline, and user account management.
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-white px-5 overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'jobs'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Moderation Queue</span>
            {metrics?.pendingJobs > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {metrics.pendingJobs}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/30">
          {/* Action Success Toast */}
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {metricsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-700" />
                  <p className="text-xs text-slate-500 font-medium">Computing platform metrics...</p>
                </div>
              ) : metricsError ? (
                <div className="p-6 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-700 font-medium">{metricsError}</p>
                  <button
                    type="button"
                    onClick={loadMetrics}
                    className="mt-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Retry
                  </button>
                </div>
              ) : metrics && (
                <>
                  {/* Top Stats Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Users */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Users</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">{metrics.totalUsers}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{metrics.totalJobseekers} jobseekers</span>
                        <span>•</span>
                        <span>{metrics.totalEmployers} employers</span>
                      </div>
                    </div>

                    {/* Total Jobs */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Job Postings</span>
                        <Briefcase className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">{metrics.totalJobs}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="text-emerald-700 font-semibold">{metrics.approvedJobs} approved</span>
                        <span>•</span>
                        <span className="text-rose-700 font-semibold">{metrics.rejectedJobs} rejected</span>
                      </div>
                    </div>

                    {/* Jobs Awaiting Moderation */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Moderation Queue</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black text-amber-600">{metrics.pendingJobs}</div>
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        {metrics.pendingJobs > 0 ? (
                          <span className="text-amber-700 font-medium">Awaiting administrator review</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">All listings moderated</span>
                        )}
                      </div>
                    </div>

                    {/* Total Applications */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</span>
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-slate-900">{metrics.totalApplications}</div>
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Submitted across all job roles</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Platform Activity */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Recent Platform Activity
                      </h3>
                      <button
                        type="button"
                        onClick={loadMetrics}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {metrics.recentActivity.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">No recent activity recorded.</p>
                      ) : (
                        metrics.recentActivity.map((act, i) => (
                          <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                              <div>
                                <span className="font-bold text-slate-800">{act.title}</span>
                                <span className="text-slate-500 ml-2">{act.description}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                              {formatRelativeTime(act.timestamp)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: JOB MODERATION QUEUE */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Status:</span>
                  </span>
                  {['all', 'pending', 'approved', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setJobsPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        statusFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}

                  <span className="text-xs font-bold text-slate-600 ml-2">Visibility:</span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'true', label: 'Active' },
                    { id: 'false', label: 'Deactivated' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setActiveFilter(v.id);
                        setJobsPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        activeFilter === v.id
                          ? 'bg-purple-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search title, company..."
                      value={jobSearch}
                      onChange={(e) => {
                        setJobSearch(e.target.value);
                        setJobsPage(1);
                      }}
                      className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-800 w-44 sm:w-56"
                    />
                  </div>
                </div>
              </div>

              {/* Jobs Table/List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {jobsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                    <p className="text-xs text-slate-500">Loading moderation queue...</p>
                  </div>
                ) : jobsError ? (
                  <div className="p-6 text-center text-xs text-rose-600">
                    {jobsError}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">No job listings found</h4>
                    <p className="text-[11px] text-slate-400">No jobs match the selected filter criteria.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {jobs.map((job) => {
                      const isPending = job.status === 'pending';
                      const isApproved = job.status === 'approved' || !job.status;
                      const isRejected = job.status === 'rejected';
                      const isDeactivated = job.isActive === false;

                      return (
                        <div key={job._id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {job.title}
                              </h4>
                              {/* Status Badge */}
                              {isPending ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Pending Review
                                </span>
                              ) : isRejected ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Rejected
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Approved
                                </span>
                              )}

                              {isDeactivated && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Deactivated
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600">
                              <strong className="text-slate-800">{job.company}</strong> • {job.location} • {job.employmentType} ({job.workplaceType})
                            </p>

                            <p className="text-[11px] text-slate-400">
                              Employer: {job.createdBy?.name || 'Unassigned'} ({job.createdBy?.email || 'N/A'}) • Posted {formatRelativeTime(job.createdAt)}
                            </p>

                            {isRejected && job.rejectionReason && (
                              <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1">
                                <strong>Rejection Reason:</strong> {job.rejectionReason}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(job)}
                                  disabled={actionLoadingId === job._id}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {actionLoadingId === job._id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openRejectModal(job)}
                                  disabled={actionLoadingId === job._id}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(job)}
                                disabled={actionLoadingId === job._id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border ${
                                  job.isActive !== false
                                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                    : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                              >
                                {actionLoadingId === job._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : job.isActive !== false ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Reactivate</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {jobsTotalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Page {jobsPage} of {jobsTotalPages} ({jobsTotalCount} total listings)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                        disabled={jobsPage <= 1}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobsPage((p) => Math.min(jobsTotalPages, p + 1))}
                        disabled={jobsPage >= jobsTotalPages}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Role:</span>
                  </span>
                  {[
                    { id: 'all', label: 'All Users' },
                    { id: 'jobseeker', label: 'Job Seekers' },
                    { id: 'employer', label: 'Employers' },
                    { id: 'admin', label: 'Admins' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setUserRoleFilter(r.id);
                        setUsersPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        userRoleFilter === r.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search name, email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUsersPage(1);
                      }}
                      className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-800 w-48 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadUsers}
                    title="Refresh user list"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {usersLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                    <p className="text-xs text-slate-500">Loading user registry...</p>
                  </div>
                ) : usersError ? (
                  <div className="p-6 text-center text-xs text-rose-600 flex flex-col items-center gap-2">
                    <span>{usersError}</span>
                    <button
                      type="button"
                      onClick={loadUsers}
                      className="px-3 py-1 rounded bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                    >
                      Retry
                    </button>
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">No users found</h4>
                    <p className="text-[11px] text-slate-400">No user accounts match the criteria.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <div key={u._id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : u.role === 'employer'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">{u.email}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Joined {formatRelativeTime(u.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {usersTotalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Page {usersPage} of {usersTotalPages} ({usersTotalCount} users)
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                        disabled={usersPage <= 1}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                        disabled={usersPage >= usersTotalPages}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            HireHub Staff Administration Console • Role: Administrator
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            Close Dashboard
          </button>
        </div>
      </div>

      {/* Reject Modal Sub-dialog */}
      {rejectModalJob && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setRejectModalJob(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reject Job Posting</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  {rejectModalJob.title} ({rejectModalJob.company})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalJob(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rejectError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {rejectError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Reason for Rejection (Required)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Inappropriate job description, misleading compensation, or duplicate posting..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 resize-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                This explanation will be shared with the employer in an automated alert.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalJob(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalJob._id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoadingId === rejectModalJob._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
