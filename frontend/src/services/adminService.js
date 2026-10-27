const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Fetch server-derived platform metrics and recent activity for the Admin Dashboard.
 */
export async function getAdminMetrics() {
  const response = await fetch(`${API_BASE_URL}/admin/metrics`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch admin metrics');
  }
  return data;
}

/**
 * Fetch jobs for moderation queue with pagination and filters.
 */
export async function getAdminJobs(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.isActive !== undefined && params.isActive !== 'all') query.append('isActive', params.isActive);
  if (params.search) query.append('search', params.search);

  const response = await fetch(`${API_BASE_URL}/admin/jobs?${query.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch admin jobs');
  }
  return data;
}

/**
 * Approve or reject a job posting.
 */
export async function moderateJob(jobId, status, rejectionReason = '') {
  const response = await fetch(`${API_BASE_URL}/admin/jobs/${jobId}/moderate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ status, rejectionReason }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Failed to ${status} job posting`);
  }
  return data;
}

/**
 * Deactivate or reactivate a published job posting.
 */
export async function toggleJobActive(jobId, isActive) {
  const response = await fetch(`${API_BASE_URL}/admin/jobs/${jobId}/toggle-active`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ isActive }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Failed to ${isActive ? 'reactivate' : 'deactivate'} job`);
  }
  return data;
}

/**
 * Fetch paginated user list for admin management.
 */
export async function getAdminUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.role && params.role !== 'all') query.append('role', params.role);
  if (params.search) query.append('search', params.search);

  const response = await fetch(`${API_BASE_URL}/admin/users?${query.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch users');
  }
  return data;
}
