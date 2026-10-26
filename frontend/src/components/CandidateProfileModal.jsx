import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  User,
  Briefcase,
  Globe,
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import {
  getMyProfile,
  updateMyProfile,
  uploadResume,
  downloadMyResume,
  deleteMyResume,
} from '../services/profileService';

const STEPS = [
  { id: 1, title: 'Overview & Skills', subtitle: 'Headline, bio & tech stack', icon: User },
  { id: 2, title: 'Experience & Education', subtitle: 'Work history & degrees', icon: Briefcase },
  { id: 3, title: 'Portfolio & Links', subtitle: 'GitHub, LinkedIn & websites', icon: Globe },
  { id: 4, title: 'Secure Resume', subtitle: 'Upload & verify PDF', icon: FileText },
];

export default function CandidateProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Profile Form States
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [portfolioLinks, setPortfolioLinks] = useState({
    github: '',
    linkedin: '',
    portfolio: '',
    website: '',
  });

  // Track initial data to detect unsaved changes
  const initialDataRef = useRef(null);

  // Resume Upload States
  const [resumeMeta, setResumeMeta] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const fileInputRef = useRef(null);

  // Load profile data on mount / open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    getMyProfile()
      .then((res) => {
        if (!isMounted) return;
        const prof = res.data || {};
        const loadedHeadline = prof.headline || '';
        const loadedSummary = prof.summary || '';
        const loadedSkills = prof.skills || [];
        const loadedEducation = prof.education || [];
        const loadedExperience = prof.experience || [];
        const loadedLinks = prof.portfolioLinks || { github: '', linkedin: '', portfolio: '', website: '' };

        setHeadline(loadedHeadline);
        setSummary(loadedSummary);
        setSkills(loadedSkills);
        setEducation(loadedEducation);
        setExperience(loadedExperience);
        setPortfolioLinks(loadedLinks);
        setResumeMeta(prof.resume || null);

        // Cache initial values for dirty checking
        initialDataRef.current = {
          headline: loadedHeadline,
          summary: loadedSummary,
          skills: [...loadedSkills],
          education: JSON.parse(JSON.stringify(loadedEducation)),
          experience: JSON.parse(JSON.stringify(loadedExperience)),
          portfolioLinks: { ...loadedLinks },
        };

        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Dirty state checker
  const hasUnsavedChanges = useCallback(() => {
    if (!initialDataRef.current) return false;
    const init = initialDataRef.current;
    if (headline !== init.headline) return true;
    if (summary !== init.summary) return true;
    if (JSON.stringify(skills) !== JSON.stringify(init.skills)) return true;
    if (JSON.stringify(education) !== JSON.stringify(init.education)) return true;
    if (JSON.stringify(experience) !== JSON.stringify(init.experience)) return true;
    if (JSON.stringify(portfolioLinks) !== JSON.stringify(init.portfolioLinks)) return true;
    return false;
  }, [headline, summary, skills, education, experience, portfolioLinks]);

  // Safe close handler with unsaved changes prompt
  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges() && !saving) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in your candidate profile. Are you sure you want to close without saving?'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  }, [hasUnsavedChanges, saving, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleRequestClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleRequestClose]);

  if (!isOpen) return null;

  // Skills Tag Handlers
  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Experience handlers
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' },
    ]);
  };

  const handleUpdateExperience = (index, field, value) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    setExperience(updated);
  };

  const handleRemoveExperience = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  // Education handlers
  const handleAddEducation = () => {
    setEducation([
      ...education,
      { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' },
    ]);
  };

  const handleUpdateEducation = (index, field, value) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const handleRemoveEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // Step Validation Logic
  const validateStep = (stepNumber) => {
    if (stepNumber === 1) {
      if (headline.length > 120) {
        return 'Professional headline cannot exceed 120 characters.';
      }
      if (summary.length > 2000) {
        return 'Professional summary cannot exceed 2,000 characters.';
      }
      // If user typed a skill without pressing enter, auto-add it
      if (skillInput.trim()) {
        const clean = skillInput.trim();
        if (!skills.includes(clean)) {
          setSkills((prev) => [...prev, clean]);
          setSkillInput('');
        }
      }
      return null;
    }

    if (stepNumber === 2) {
      for (let i = 0; i < experience.length; i++) {
        const exp = experience[i];
        const hasAnyField = exp.title?.trim() || exp.company?.trim() || exp.description?.trim();
        if (hasAnyField) {
          if (!exp.title?.trim()) {
            return `Please provide a Job Title for Role #${i + 1}, or remove it.`;
          }
          if (!exp.company?.trim()) {
            return `Please provide a Company name for Role #${i + 1}, or remove it.`;
          }
        }
      }

      for (let i = 0; i < education.length; i++) {
        const edu = education[i];
        const hasAnyField = edu.school?.trim() || edu.degree?.trim() || edu.fieldOfStudy?.trim();
        if (hasAnyField) {
          if (!edu.school?.trim()) {
            return `Please provide an Institution for Education #${i + 1}, or remove it.`;
          }
        }
      }
      return null;
    }

    if (stepNumber === 3) {
      const isValidUrl = (urlStr) => {
        if (!urlStr || !urlStr.trim()) return true;
        try {
          const parsed = new URL(urlStr.trim());
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      if (portfolioLinks.github && !isValidUrl(portfolioLinks.github)) {
        return 'Please enter a valid GitHub URL (including https://).';
      }
      if (portfolioLinks.linkedin && !isValidUrl(portfolioLinks.linkedin)) {
        return 'Please enter a valid LinkedIn URL (including https://).';
      }
      if (portfolioLinks.portfolio && !isValidUrl(portfolioLinks.portfolio)) {
        return 'Please enter a valid Portfolio URL (including https://).';
      }
      if (portfolioLinks.website && !isValidUrl(portfolioLinks.website)) {
        return 'Please enter a valid Website URL (including https://).';
      }
      return null;
    }

    return null;
  };

  // Next step navigation
  const handleNextStep = () => {
    setError(null);
    const validationErr = validateStep(currentStep);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  // Previous step navigation
  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Direct step pill navigation
  const handleStepClick = (targetStep) => {
    if (targetStep === currentStep) return;
    setError(null);

    // If moving backward, allow freely
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // If moving forward, validate current step first
    const validationErr = validateStep(currentStep);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setCurrentStep(targetStep);
  };

  // Save full profile details (Step 4 main action)
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (saving) return; // Prevent accidental duplicate submissions

    // Validate all steps before final save
    const step1Err = validateStep(1);
    if (step1Err) {
      setError(step1Err);
      setCurrentStep(1);
      return;
    }
    const step2Err = validateStep(2);
    if (step2Err) {
      setError(step2Err);
      setCurrentStep(2);
      return;
    }
    const step3Err = validateStep(3);
    if (step3Err) {
      setError(step3Err);
      setCurrentStep(3);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await updateMyProfile({
        headline: headline.trim(),
        summary: summary.trim(),
        skills,
        education,
        experience,
        portfolioLinks,
      });

      // Update initial ref to current saved data
      initialDataRef.current = {
        headline: headline.trim(),
        summary: summary.trim(),
        skills: [...skills],
        education: JSON.parse(JSON.stringify(education)),
        experience: JSON.parse(JSON.stringify(experience)),
        portfolioLinks: { ...portfolioLinks },
      };

      setSuccessMsg('Candidate profile updated successfully!');
      if (onProfileUpdated) onProfileUpdated(res.data);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setError(err.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle Resume File Selected
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files (.pdf) are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5 MB limit. Please select a smaller PDF.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const res = await uploadResume(file, (percent) => {
        setUploadProgress(percent);
      });

      setResumeMeta(res.data);
      setSuccessMsg('PDF resume uploaded and securely stored!');
      if (onProfileUpdated) onProfileUpdated({ resume: res.data });
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Download resume handler
  const handleDownloadResume = async () => {
    try {
      await downloadMyResume(resumeMeta?.originalName || 'my_resume.pdf');
    } catch (err) {
      alert(err.message || 'Failed to download resume');
    }
  };

  // Delete resume handler
  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your resume? Employers will no longer be able to download it.')) {
      return;
    }

    setIsDeletingResume(true);
    setUploadError(null);

    try {
      await deleteMyResume();
      setResumeMeta(null);
      setSuccessMsg('Resume deleted successfully.');
      if (onProfileUpdated) onProfileUpdated({ resume: null });
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setUploadError(err.message || 'Failed to delete resume');
    } finally {
      setIsDeletingResume(false);
    }
  };

  const progressPercent = Math.round((currentStep / 4) * 100);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 transition-opacity"
      onClick={handleRequestClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Candidate Profile Wizard
              </h2>
              <p className="text-xs text-slate-500">
                Complete your profile and manage your verified PDF resume in 4 guided steps.
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guided Wizard Step Indicator & Progress */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-800">
              Step {currentStep} of 4: <span className="text-slate-600 font-normal">{STEPS[currentStep - 1].title}</span>
            </span>
            <span className="font-medium text-slate-500">{progressPercent}% Completed</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
            <div 
              className="bg-slate-900 h-1.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Wizard Step Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const IconComp = step.icon;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-800'
                      : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold truncate leading-tight flex items-center gap-1">
                      <IconComp className="w-3 h-3 shrink-0 opacity-80" />
                      <span className="truncate">{step.title}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
              <p className="text-xs text-slate-500 font-medium">Loading candidate profile...</p>
            </div>
          ) : (
            <>
              {/* Feedback Banners */}
              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button type="button" onClick={() => setError(null)} className="text-[11px] font-semibold text-rose-700 hover:text-rose-900">
                    Dismiss
                  </button>
                </div>
              )}

              {/* STEP 1: Overview & Skills */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Step 1: Professional Overview & Skills</h3>
                    <p className="text-xs text-slate-500">Provide your primary headline, technical background, and key competencies.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Professional Headline
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Senior Full Stack Engineer • Distributed Systems & React"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1 text-right">
                      {headline.length}/120
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Professional Summary / Bio
                    </label>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Summarize your engineering background, favorite tech stack, system achievements, or core expertise..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all resize-y"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1 text-right">
                      {summary.length}/2000
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Skills & Technologies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        maxLength={50}
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Add a skill (e.g. React 19, TypeScript, Kafka) and press Enter"
                        className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60 min-h-[50px]">
                      {skills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No skills added yet.</span>
                      ) : (
                        skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-xs"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              aria-label={`Remove ${skill}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Experience & Education */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Step 2: Experience & Education</h3>
                    <p className="text-xs text-slate-500">Document your relevant professional roles and academic background.</p>
                  </div>

                  {/* Experience Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Work Experience
                        </h4>
                        <p className="text-[11px] text-slate-500">Add engineering positions and impact.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddExperience}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Role</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {experience.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                          No work experience added yet. Click &quot;Add Role&quot; above to list positions.
                        </div>
                      ) : (
                        experience.map((exp, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700">Role #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExperience(idx)}
                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Job Title (e.g. Lead Engineer)"
                                value={exp.title}
                                onChange={(e) => handleUpdateExperience(idx, 'title', e.target.value)}
                                className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Company (e.g. Linear Labs)"
                                value={exp.company}
                                onChange={(e) => handleUpdateExperience(idx, 'company', e.target.value)}
                                className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Location (e.g. Remote / San Francisco)"
                                value={exp.location || ''}
                                onChange={(e) => handleUpdateExperience(idx, 'location', e.target.value)}
                                className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Start (e.g. 2021)"
                                  value={exp.startDate || ''}
                                  onChange={(e) => handleUpdateExperience(idx, 'startDate', e.target.value)}
                                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                                />
                                <input
                                  type="text"
                                  placeholder="End (e.g. Present)"
                                  value={exp.endDate || ''}
                                  onChange={(e) => handleUpdateExperience(idx, 'endDate', e.target.value)}
                                  className="w-1/2 text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                                />
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Responsibilities, achievements, tech stack..."
                              value={exp.description || ''}
                              onChange={(e) => handleUpdateExperience(idx, 'description', e.target.value)}
                              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Education Section */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Education & Certifications
                        </h4>
                        <p className="text-[11px] text-slate-500">Degrees, certifications or bootcamps.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEducation}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Education</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {education.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                          No education listed. Click &quot;Add Education&quot; to include degrees.
                        </div>
                      ) : (
                        education.map((edu, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700">Education #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveEducation(idx)}
                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="School / University (e.g. Stanford)"
                                value={edu.school || ''}
                                onChange={(e) => handleUpdateEducation(idx, 'school', e.target.value)}
                                className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Degree (e.g. B.S. Computer Science)"
                                value={edu.degree || ''}
                                onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)}
                                className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Portfolio & Links */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Step 3: Portfolio & Verified Links</h3>
                    <p className="text-xs text-slate-500">
                      Add verified URLs so engineering managers can evaluate your open source contributions, repositories, and portfolio.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      GitHub Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={portfolioLinks.github || ''}
                      onChange={(e) => setPortfolioLinks({ ...portfolioLinks, github: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={portfolioLinks.linkedin || ''}
                      onChange={(e) => setPortfolioLinks({ ...portfolioLinks, linkedin: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Personal Portfolio / Website URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourportfolio.dev"
                      value={portfolioLinks.portfolio || ''}
                      onChange={(e) => setPortfolioLinks({ ...portfolioLinks, portfolio: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Secure Resume */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Step 4: Secure Resume Verification & Final Review</h3>
                    <p className="text-xs text-slate-500">
                      Upload your technical resume in PDF format. When ready, click &quot;Save Profile Changes&quot; below to commit your profile.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">Zero-Public Storage Security</h4>
                      <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                        Your resume is stored securely in private object storage with binary signature validation (%PDF-). It is never indexed or accessible publicly; only employers whose job postings you actively apply to are granted authorized access.
                      </p>
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Upload Error Banner */}
                  {uploadError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-[11px] font-semibold text-rose-700 hover:text-rose-900"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Progress Bar when uploading */}
                  {uploading && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>Encrypting & uploading resume...</span>
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Active Resume Card or Upload Dropzone */}
                  {resumeMeta?.originalName ? (
                    <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate max-w-xs">
                              {resumeMeta.originalName}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active PDF
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(resumeMeta.sizeBytes ? (resumeMeta.sizeBytes / (1024 * 1024)).toFixed(2) : '1.2')} MB • Encrypted in Private Storage
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadResume}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteResume}
                          disabled={isDeletingResume}
                          className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Delete Resume"
                        >
                          {isDeletingResume ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white text-slate-700 border border-slate-200 flex items-center justify-center mx-auto shadow-xs">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Upload your PDF Resume</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Click to select your official technical resume. Must be in PDF format and under 5 MB.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
                        <span>Select .PDF File</span>
                      </div>
                    </div>
                  )}

                  {/* Summary Review of Profile Changes */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                    <p className="font-semibold text-slate-800">Ready to save?</p>
                    <p className="text-[11px] text-slate-500">
                      Headline: <span className="text-slate-700 font-medium">{headline || 'Not set'}</span> • 
                      Skills: <span className="text-slate-700 font-medium">{skills.length} added</span> • 
                      Experience: <span className="text-slate-700 font-medium">{experience.length} roles</span> • 
                      Education: <span className="text-slate-700 font-medium">{education.length} listed</span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Wizard Navigation Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || loading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
