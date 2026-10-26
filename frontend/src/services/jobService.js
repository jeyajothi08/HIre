const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Fetch a list of jobs from the API with optional search, filters, and pagination.
 * @param {Object} params - Query parameters (search, location, employmentType, workplaceType, page, limit, sortBy)
 * @returns {Promise<{success: boolean, count: number, total: number, page: number, totalPages: number, data: Array}>}
 */
export async function getJobs(params = {}) {
  const query = new URLSearchParams();

  if (params.search && params.search.trim()) {
    query.set('q', params.search.trim());
  }
  if (params.location && params.location.trim()) {
    query.set('location', params.location.trim());
  }
  if (params.employmentType && params.employmentType !== 'All') {
    query.set('employmentType', params.employmentType);
  }
  if (params.workplaceType && params.workplaceType !== 'All') {
    query.set('workplaceType', params.workplaceType);
  }
  if (params.page) {
    query.set('page', params.page);
  }
  if (params.limit) {
    query.set('limit', params.limit);
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }

  const queryString = query.toString();
  const url = `${API_BASE_URL}/jobs${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch jobs (Status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Job API error in getJobs:', error);
    throw error;
  }
}

/**
 * Fetch a single job by its MongoDB ObjectId.
 * @param {string} id - The MongoDB ObjectId of the job.
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export async function getJobById(id) {
  if (!id) {
    throw new Error('A valid Job ID is required');
  }

  const url = `${API_BASE_URL}/jobs/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch job details (Status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Job API error in getJobById(${id}):`, error);
    throw error;
  }
}

/**
 * Format salary figures into human-readable currency strings.
 * e.g., (140000, 175000) -> "$140k – $175k"
 */
export function formatSalary(min, max) {
  if (min == null && max == null) {
    return 'Competitive';
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      const k = num / 1000;
      return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
    }
    return `$${num.toLocaleString()}`;
  };

  if (min != null && max != null) {
    if (min === max) return formatNumber(min);
    return `${formatNumber(min)} – ${formatNumber(max)}`;
  }

  if (min != null) return `${formatNumber(min)}+`;
  return `Up to ${formatNumber(max)}`;
}

/**
 * Format timestamp into relative time string.
 * e.g., "2h ago", "1d ago", "Just now"
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
