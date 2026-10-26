import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft,
  ArrowUpRight, 
  Building2, 
  Sparkles, 
  Menu, 
  X,
  Bookmark,
  AlertCircle,
  RefreshCw,
  LogOut,
  Plus,
  ShieldCheck,
  ChevronDown,
  Users,
  FileText,
  User
} from 'lucide-react';
import { getJobs, formatSalary, formatRelativeTime } from './services/jobService';
import { getMe, logout } from './services/authService';
import { getMyApplications } from './services/applicationService';
import JobDetailsModal from './components/JobDetailsModal';
import AuthModal from './components/AuthModal';
import CreateJobModal from './components/CreateJobModal';
import MyApplicationsModal from './components/MyApplicationsModal';
import EmployerApplicantsModal from './components/EmployerApplicantsModal';
import CandidateProfileModal from './components/CandidateProfileModal';

const WORKPLACE_TABS = ['All', 'Remote', 'Hybrid', 'On-site'];
const TRENDING_TAGS = ['Remote', 'React', 'Node.js', 'TypeScript', 'MongoDB', 'Design Systems'];

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeLocation, setActiveLocation] = useState('');
  const [selectedWorkplace, setSelectedWorkplace] = useState('All');
  const [retryCount, setRetryCount] = useState(0);
  
  // Data state
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Saved jobs & Modal state
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      const stored = localStorage.getItem('hirehub_saved_jobs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Authentication & Dialog state
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [authModalRole, setAuthModalRole] = useState('jobseeker');
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [myApplicationsModalOpen, setMyApplicationsModalOpen] = useState(false);
  const [employerApplicantsModalOpen, setEmployerApplicantsModalOpen] = useState(false);
  const [candidateProfileModalOpen, setCandidateProfileModalOpen] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Check active session on initial mount
  useEffect(() => {
    getMe().then((existingUser) => {
      if (existingUser) setUser(existingUser);
    });
  }, []);

  // Fetch submitted applications when logged in as jobseeker
  useEffect(() => {
    if (!user || user.role !== 'jobseeker') {
      return;
    }

    let isMounted = true;
    getMyApplications()
      .then((res) => {
        if (isMounted && res && res.data) {
          const ids = new Set(
            res.data
              .map((app) => (app.job && app.job._id ? app.job._id : app.job))
              .filter(Boolean)
          );
          setAppliedJobIds(ids);
        }
      })
      .catch(() => {
        // Gracefully ignore fetch errors
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Post Job CTA handler
  const handleOpenPostJob = () => {
    if (!user) {
      setAuthModalTab('register');
      setAuthModalRole('employer');
      setAuthModalOpen(true);
      return;
    }
    if (user.role !== 'employer' && user.role !== 'admin') {
      alert('Posting jobs requires an Employer account. Please sign in or register as an Employer.');
      return;
    }
    setCreateJobModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // Ignore network errors on logout and reset local session
    }
    setUser(null);
    setAppliedJobIds(new Set());
    setUserMenuOpen(false);
  };

  const handleJobCreated = (newJob) => {
    setRetryCount((c) => c + 1);
    setCurrentPage(1);
    if (newJob && newJob._id) {
      setSelectedJobId(newJob._id);
    }
  };

  // Sync saved jobs to localStorage
  const toggleSaveJob = (id, e) => {
    if (e) e.stopPropagation();
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('hirehub_saved_jobs', JSON.stringify([...next]));
      } catch {
        // Ignore localStorage quota or private mode issues
      }
      return next;
    });
  };

  // Fetch jobs whenever filters or page changes
  useEffect(() => {
    let active = true;

    const params = {
      page: currentPage,
      limit: 5,
      search: activeSearch,
      location: activeLocation,
      workplaceType: selectedWorkplace,
    };

    getJobs(params)
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setJobs(res.data || []);
          setTotalJobs(res.total || 0);
          setTotalPages(res.totalPages || 1);
        } else {
          setError(res.message || 'Failed to fetch jobs');
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error fetching jobs:', err);
        setError(err.message || 'Could not connect to HireHub API server. Please ensure the backend is running.');
        setJobs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentPage, activeSearch, activeLocation, selectedWorkplace, retryCount]);

  // Handle URL hash for direct job link opening (e.g. #job-<id>)
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#job-')) {
        const id = hash.replace('#job-', '');
        if (id) setSelectedJobId(id);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const openJobModal = (id) => {
    setSelectedJobId(id);
  };

  const closeJobModal = () => {
    setSelectedJobId(null);
  };

  // Handle search submission
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchQuery);
    setActiveLocation(locationQuery);
    setCurrentPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setActiveSearch('');
    setActiveLocation('');
    setSelectedWorkplace('All');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      {/* Top Notice Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 text-center border-b border-slate-800">
        <span className="font-medium text-white">HireHub Live API v1.0:</span> Real-time verified engineering roles backed by MongoDB Atlas.
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-8">
            <a href="#" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
                H
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Hire<span className="text-blue-600">Hub</span>
              </span>
            </a>

            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
              <a href="#jobs" className="text-slate-900 transition-colors">Find Jobs</a>
              <a href="#about" className="hover:text-slate-900 transition-colors">Why HireHub</a>
              <a href="http://localhost:5001/api/v1/health" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>API Status</span>
              </a>
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {/* Role Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {user.role === 'employer' ? (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Employer</span>
                    </>
                  ) : user.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Admin</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Job Seeker</span>
                    </>
                  )}
                </div>

                {/* Job Seeker Actions: My Applications & Profile */}
                {user.role === 'jobseeker' && (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setCandidateProfileModalOpen(true)}
                      className="text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-800 px-3 py-2 rounded-lg transition-all hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Profile & Resume</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setMyApplicationsModalOpen(true)}
                      className="text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-800 px-3 py-2 rounded-lg transition-all hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>My Applications</span>
                      {appliedJobIds.size > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {appliedJobIds.size}
                        </span>
                      )}
                    </button>
                  </>
                )}

                {/* Employer Action: Review Applicants */}
                {(user.role === 'employer' || user.role === 'admin') && (
                  <button 
                    type="button" 
                    onClick={() => setEmployerApplicantsModalOpen(true)}
                    className="text-xs font-semibold border border-slate-300 hover:border-slate-400 text-slate-800 px-3 py-2 rounded-lg transition-all hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Review Applicants</span>
                  </button>
                )}

                {/* Post a Job button (Active for employer) */}
                <button 
                  type="button" 
                  onClick={handleOpenPostJob}
                  className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Post a Job</span>
                </button>

                {/* User Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <span className="text-xs font-semibold max-w-[120px] truncate">{user.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>

                      {user.role === 'jobseeker' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              setCandidateProfileModalOpen(true);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium"
                          >
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>Candidate Profile & Resume</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              setMyApplicationsModalOpen(true);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>My Applications ({appliedJobIds.size})</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setEmployerApplicantsModalOpen(true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>Candidate Pipeline</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium mt-1 border-t border-slate-100"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button 
                  type="button" 
                  onClick={handleOpenPostJob}
                  className="text-sm font-medium border border-slate-300 hover:border-slate-400 text-slate-800 px-3.5 py-2 rounded-lg transition-all hover:bg-slate-50"
                >
                  Post a Job
                </button>
                <a 
                  href="#jobs" 
                  className="text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Explore Roles
                </a>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            <a href="#jobs" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-1.5">Find Jobs</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-1.5">Why HireHub</a>
            <a href="http://localhost:5001/api/v1/health" target="_blank" rel="noreferrer" className="block text-sm font-medium text-slate-800 py-1.5">API Status</a>
            
            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-2 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                    </div>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs text-red-600 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>

                  {user.role === 'jobseeker' ? (
                    <>
                      <button 
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setCandidateProfileModalOpen(true);
                        }}
                        className="w-full text-center py-2 text-sm font-medium border border-slate-200 rounded-lg flex items-center justify-center gap-2"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        <span>Profile & Resume</span>
                      </button>

                      <button 
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMyApplicationsModalOpen(true);
                        }}
                        className="w-full text-center py-2 text-sm font-medium border border-slate-200 rounded-lg flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>My Applications ({appliedJobIds.size})</span>
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setEmployerApplicantsModalOpen(true);
                      }}
                      className="w-full text-center py-2 text-sm font-medium border border-slate-200 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Review Applicants</span>
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenPostJob();
                    }}
                    className="w-full text-center py-2 text-sm font-medium bg-slate-900 text-white rounded-lg"
                  >
                    Post a Job
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalTab('login');
                      setAuthModalOpen(true);
                    }}
                    className="w-full text-center py-2 text-sm font-medium border border-slate-200 rounded-lg"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenPostJob();
                    }}
                    className="w-full text-center py-2 text-sm font-medium bg-slate-900 text-white rounded-lg"
                  >
                    Post a Job
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        {/* Subtle Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-subtle mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Live MongoDB Jobs Feed</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">100% Verified Tech Roles</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.12]">
          Where ambitious tech talent meets modern engineering teams.
        </h1>
        
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Skip generic job aggregators. Explore high-signal roles with direct engineering hiring manager contact, transparent salaries, and verified requirements.
        </p>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-10 max-w-4xl mx-auto bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-subtle text-left">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            {/* Keyword Search */}
            <div className="md:col-span-5 flex items-center px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60 focus-within:border-slate-400 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Title, skill, or keyword (e.g. React, Node)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Location Search */}
            <div className="md:col-span-4 flex items-center px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60 focus-within:border-slate-400 focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="City or Country (e.g. San Francisco)"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Submit CTA */}
            <div className="md:col-span-3">
              <button 
                type="submit" 
                className="w-full h-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl px-4 py-2.5 flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                <span>Find Opportunities</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Trending Tags */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between px-2 gap-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-700 mr-1">Trending:</span>
              {TRENDING_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    setSearchQuery(tag);
                    setActiveSearch(tag);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeSearch === tag 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {(activeSearch || activeLocation || selectedWorkplace !== 'All') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </form>

        {/* Metrics Overview */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200/80 pt-8">
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">{totalJobs}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active Roles in Atlas</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">100%</div>
            <div className="text-xs text-slate-500 mt-0.5">Verified Pay Bands</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">7 Days</div>
            <div className="text-xs text-slate-500 mt-0.5">Response SLA</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">&lt;50ms</div>
            <div className="text-xs text-slate-500 mt-0.5">API Query Latency</div>
          </div>
        </div>
      </section>

      {/* Main Jobs Listing Section */}
      <section id="jobs" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Explore Open Roles</h2>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? (
                <span>Loading available opportunities...</span>
              ) : (
                <span>Showing {jobs.length} of {totalJobs} verified position{totalJobs === 1 ? '' : 's'}</span>
              )}
            </p>
          </div>

          {/* Workplace Type Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            {WORKPLACE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedWorkplace(tab);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedWorkplace === tab 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Failed to load jobs from backend</span>
                <span className="text-rose-700 mt-0.5 block">{error}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                setRetryCount((c) => c + 1);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Job Cards Container */}
        <div className="mt-6 space-y-3">
          {/* Skeleton Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div 
                  key={n} 
                  className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0"></div>
                    <div className="space-y-2.5">
                      <div className="h-3.5 bg-slate-200 rounded w-32"></div>
                      <div className="h-5 bg-slate-200 rounded w-64"></div>
                      <div className="flex gap-2">
                        <div className="h-3 bg-slate-100 rounded w-20"></div>
                        <div className="h-3 bg-slate-100 rounded w-20"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex md:flex-col items-end gap-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-5 bg-slate-100 rounded w-16"></div>
                      <div className="h-5 bg-slate-100 rounded w-16"></div>
                    </div>
                    <div className="h-8 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Results State */}
          {!loading && !error && jobs.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900">No matching jobs found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No roles matched your current search and filters. Try adjusting your search query, location, or workplace type.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Real Jobs Rendered from MongoDB */}
          {!loading && !error && jobs.length > 0 && (
            jobs.map((job) => (
              <div 
                key={job._id}
                onClick={() => openJobModal(job._id)}
                className="group bg-white border border-slate-200 hover:border-slate-300 hover:shadow-subtle rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                {/* Left: Job Meta & Title */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-base group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    {job.company ? job.company.charAt(0) : 'H'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 tracking-wide">{job.company}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                        {job.workplaceType}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(job.createdAt)}</span>
                      {user && (job.createdBy === user.id || job.createdBy === user._id || (job.createdBy && job.createdBy._id === user.id)) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Your Listing
                        </span>
                      )}
                      {appliedJobIds.has(job._id) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Applied
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                      {job.title}
                      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </h3>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {job.employmentType}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Tags & Action Buttons */}
                <div className="flex flex-wrap items-center md:flex-col md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="flex flex-wrap gap-1.5 max-w-xs md:justify-end">
                    {job.skills && job.skills.slice(0, 4).map((skill) => (
                      <span 
                        key={skill}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills && job.skills.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-medium">
                        +{job.skills.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => toggleSaveJob(job._id, e)}
                      className={`p-2 rounded-lg border transition-colors ${
                        savedJobs.has(job._id)
                          ? 'border-blue-300 bg-blue-50 text-blue-600'
                          : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                      aria-label="Save job"
                    >
                      <Bookmark className="w-4 h-4" fill={savedJobs.has(job._id) ? "currentColor" : "none"} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openJobModal(job._id);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Real API Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-5 gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalJobs} total jobs)
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      currentPage === num
                        ? 'bg-slate-900 text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Why HireHub Minimal Feature Grid */}
      <section id="about" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Built for high signal, zero noise.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Most job portals are cluttered with spam and outdated listings. HireHub is built on three core principles:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Direct Engineering Access</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Connect directly with engineering managers and technical founders without third-party recruiting agency middle-men.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Mandatory Pay Transparency</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Every listed role features realistic compensation bands, equity benchmarks, and job levels upfront before you apply.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold mb-4 shadow-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Guaranteed Response SLA</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Employers commit to reviewing applications within 7 business days, eliminating the traditional black hole experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              H
            </div>
            <span className="text-sm font-semibold text-slate-800">HireHub Inc.</span>
            <span className="text-xs text-slate-400">© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-500">
            <a 
              href="http://localhost:5001/api/v1/health" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Atlas DB Connected
            </a>
            <a href="#jobs" className="hover:text-slate-800 transition-colors">Browse Jobs</a>
            <a href="#about" className="hover:text-slate-800 transition-colors">About</a>
          </div>
        </div>
      </footer>

      {/* Real Job Details Modal */}
      <JobDetailsModal
        key={selectedJobId || 'closed'}
        jobId={selectedJobId}
        isOpen={Boolean(selectedJobId)}
        onClose={closeJobModal}
        isSaved={selectedJobId ? savedJobs.has(selectedJobId) : false}
        onToggleSave={(id) => toggleSaveJob(id)}
        user={user}
        onOpenAuthModal={(tab, role) => {
          setAuthModalTab(tab || 'login');
          if (role) setAuthModalRole(role);
          setAuthModalOpen(true);
        }}
        appliedJobIds={appliedJobIds}
        onJobApplied={(newApp) => {
          const jId = newApp.job?._id || newApp.job;
          if (jId) {
            setAppliedJobIds((prev) => new Set(prev).add(jId));
          }
        }}
        onOpenCandidateProfile={() => setCandidateProfileModalOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        key={`${authModalOpen}-${authModalTab}-${authModalRole}`}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        initialRole={authModalRole}
        onSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          if (authenticatedUser?.role !== 'jobseeker') {
            setAppliedJobIds(new Set());
          }
        }}
      />

      {/* Employer Post Job Modal */}
      <CreateJobModal
        key={createJobModalOpen ? 'create-job-open' : 'create-job-closed'}
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        onJobCreated={handleJobCreated}
      />

      {/* Jobseeker My Applications Modal */}
      <MyApplicationsModal
        isOpen={myApplicationsModalOpen}
        onClose={() => setMyApplicationsModalOpen(false)}
        onSelectJob={(id) => {
          setMyApplicationsModalOpen(false);
          setSelectedJobId(id);
        }}
      />

      {/* Employer Candidate Pipeline Modal */}
      <EmployerApplicantsModal
        isOpen={employerApplicantsModalOpen}
        onClose={() => setEmployerApplicantsModalOpen(false)}
      />

      {/* Candidate Profile & Resume Modal */}
      <CandidateProfileModal
        key={candidateProfileModalOpen ? 'candidate-profile-open' : 'candidate-profile-closed'}
        isOpen={candidateProfileModalOpen}
        onClose={() => setCandidateProfileModalOpen(false)}
      />
    </div>
  );
}
