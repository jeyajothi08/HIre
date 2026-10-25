import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ChevronRight, 
  ArrowUpRight, 
  Building2, 
  Sparkles, 
  Menu, 
  X,
  Bookmark
} from 'lucide-react';

const FEATURED_JOBS = [
  {
    id: 1,
    title: 'Senior Frontend Engineer',
    company: 'Linear Labs',
    location: 'Remote (US / Europe)',
    type: 'Full-time',
    category: 'Engineering',
    salary: '$140k – $175k',
    postedAt: '2h ago',
    featured: true,
    tags: ['React', 'TypeScript', 'Tailwind', 'Next.js'],
  },
  {
    id: 2,
    title: 'Full Stack Developer',
    company: 'Vercel Ecosystem',
    location: 'San Francisco, CA • Hybrid',
    type: 'Full-time',
    category: 'Engineering',
    salary: '$130k – $160k',
    postedAt: '5h ago',
    featured: true,
    tags: ['Node.js', 'Express', 'React', 'MongoDB'],
  },
  {
    id: 3,
    title: 'Product Designer (Design Systems)',
    company: 'Stripe Studios',
    location: 'Remote (Global)',
    type: 'Full-time',
    category: 'Design',
    salary: '$125k – $155k',
    postedAt: '1d ago',
    featured: false,
    tags: ['Figma', 'Design Systems', 'UI/UX'],
  },
  {
    id: 4,
    title: 'Backend Engineer (Node & Distributed Systems)',
    company: 'Supabase Partner',
    location: 'Bangalore, India • Hybrid',
    type: 'Full-time',
    category: 'Engineering',
    salary: '₹24L – ₹35L',
    postedAt: '1d ago',
    featured: false,
    tags: ['Node.js', 'PostgreSQL', 'Docker', 'Redis'],
  },
  {
    id: 5,
    title: 'Technical Product Manager',
    company: 'Retool Collective',
    location: 'New York, NY • On-site',
    type: 'Contract',
    category: 'Product',
    salary: '$110k – $140k',
    postedAt: '2d ago',
    featured: false,
    tags: ['API Design', 'Roadmap', 'Agile'],
  },
];

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedJobs, setSavedJobs] = useState(new Set([1]));

  const toggleSaveJob = (id) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = ['All', 'Engineering', 'Design', 'Product'];

  const filteredJobs = FEATURED_JOBS.filter((job) => {
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLocation = 
      locationQuery === '' || job.location.toLowerCase().includes(locationQuery.toLowerCase());
    return matchesCategory && matchesSearch && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      {/* Top Notice Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 text-center border-b border-slate-800">
        <span className="font-medium text-white">HireHub Preview v1.0:</span> Currently connecting verified hiring teams with ambitious engineers. No agency spam.
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
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
              <a href="#companies" className="hover:text-slate-900 transition-colors">Companies</a>
              <a href="#salaries" className="hover:text-slate-900 transition-colors">Salaries</a>
              <a href="#about" className="hover:text-slate-900 transition-colors">Why HireHub</a>
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            <button 
              type="button" 
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
            <button 
              type="button" 
              className="text-sm font-medium border border-slate-300 hover:border-slate-400 text-slate-800 px-3.5 py-2 rounded-lg transition-all hover:bg-slate-50"
            >
              Post a Job
            </button>
            <button 
              type="button" 
              className="text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </button>
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
            <a href="#jobs" className="block text-sm font-medium text-slate-800 py-1.5">Find Jobs</a>
            <a href="#companies" className="block text-sm font-medium text-slate-800 py-1.5">Companies</a>
            <a href="#salaries" className="block text-sm font-medium text-slate-800 py-1.5">Salaries</a>
            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              <button className="w-full text-center py-2 text-sm font-medium border border-slate-200 rounded-lg">Sign In</button>
              <button className="w-full text-center py-2 text-sm font-medium bg-slate-900 text-white rounded-lg">Post a Job</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        {/* Subtle Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-subtle mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Curated SaaS Careers Platform</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">100% Verified Salaries</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.12]">
          Where ambitious tech talent meets modern engineering teams.
        </h1>
        
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Skip generic job aggregators. Explore high-signal roles with direct engineering hiring manager contact, transparent salaries, and verified requirements.
        </p>

        {/* Search & Filter Bar */}
        <div className="mt-10 max-w-4xl mx-auto bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-subtle">
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
                placeholder="City, Country, or 'Remote'"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Submit CTA */}
            <div className="md:col-span-3">
              <button 
                type="button" 
                className="w-full h-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl px-4 py-2.5 flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                <span>Find Opportunities</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Tags */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between px-2 gap-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-700 mr-1">Trending:</span>
              {['Remote', 'React.js', 'Node.js', 'Full Stack', 'Design Systems'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setLocationQuery(''); }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200/80 pt-8">
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">1,240+</div>
            <div className="text-xs text-slate-500 mt-0.5">Verified Active Roles</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">420+</div>
            <div className="text-xs text-slate-500 mt-0.5">Top Tech Companies</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">86%</div>
            <div className="text-xs text-slate-500 mt-0.5">Interview Response Rate</div>
          </div>
          <div className="text-left px-4">
            <div className="text-2xl font-bold text-slate-900">$135k</div>
            <div className="text-xs text-slate-500 mt-0.5">Avg. Software Comp</div>
          </div>
        </div>
      </section>

      {/* Main Jobs Listing Section */}
      <section id="jobs" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Explore Open Roles</h2>
            <p className="text-sm text-slate-500 mt-1">Showing {filteredJobs.length} real-time opportunities</p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedCategory === cat 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="mt-6 space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No matching jobs found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or clear filters to see all roles.</p>
              <button
                onClick={() => { setSearchQuery(''); setLocationQuery(''); setSelectedCategory('All'); }}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div 
                key={job.id}
                className="group bg-white border border-slate-200 hover:border-slate-300 hover:shadow-subtle rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Job Meta & Title */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-base group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    {job.company.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 tracking-wide">{job.company}</span>
                      {job.featured && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                          Featured
                        </span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{job.postedAt}</span>
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
                        {job.type}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        {job.salary}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Tags & Action Buttons */}
                <div className="flex flex-wrap items-center md:flex-col md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleSaveJob(job.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        savedJobs.has(job.id)
                          ? 'border-blue-300 bg-blue-50 text-blue-600'
                          : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                      aria-label="Save job"
                    >
                      <Bookmark className="w-4 h-4" fill={savedJobs.has(job.id) ? "currentColor" : "none"} />
                    </button>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Quick Apply
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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

      {/* Employer Banner CTA */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900 rounded-2xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="max-w-xl">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">For Hiring Teams</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
              Hire vetted engineers in days, not months.
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Post your role to a community of active developers, designers, and tech leaders. First job post is free.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-sm text-center">
              Post a Role Now
            </button>
            <button className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-medium text-sm transition-all text-center">
              Schedule a Demo
            </button>
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
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </span>
            <a href="#" className="hover:text-slate-800 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
