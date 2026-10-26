const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Submit an application to a job posting (Jobseeker only).
 * Uses credentials: 'include' to transmit the httpOnly session cookie.
 * 
 * @param {Object} payload - { jobId, coverLetter }
 * @returns {Promise<{success: boolean, message: string, data: Object}>}
 */
export async function applyForJob({ jobId, coverLetter = '' }) {
  try {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ jobId, coverLetter }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.errors ? data.errors.join('. ') : (data.message || 'Failed to submit application');
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('Application API error in applyForJob:', error);
    throw error;
  }
}

/**
 * Get all applications submitted by the currently logged-in jobseeker.
 * 
 * @returns {Promise<{success: boolean, count: number, data: Array}>}
 */
export async function getMyApplications() {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/my`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch your applications');
    }

    return data;
  } catch (error) {
    console.error('Application API error in getMyApplications:', error);
    throw error;
  }
}

/**
 * Get all applicants for a specific job (Owning Employer or Admin).
 * 
 * @param {string} jobId - Job ObjectId
 * @returns {Promise<{success: boolean, count: number, job: Object, data: Array}>}
 */
export async function getJobApplications(jobId) {
  if (!jobId) throw new Error('Job ID is required');

  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/applications`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch applicants for this job');
    }

    return data;
  } catch (error) {
    console.error(`Application API error in getJobApplications(${jobId}):`, error);
    throw error;
  }
}

/**
 * Get all applications across all jobs for the authenticated employer.
 * 
 * @returns {Promise<{success: boolean, count: number, data: Array}>}
 */
export async function getEmployerApplications() {
  try {
    const response = await fetch(`${API_BASE_URL}/applications/employer`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch candidate applications');
    }

    return data;
  } catch (error) {
    console.error('Application API error in getEmployerApplications:', error);
    throw error;
  }
}

/**
 * Update the review status of a candidate application (Owning Employer or Admin).
 * 
 * @param {string} applicationId - Application ObjectId
 * @param {string} status - 'Pending' | 'Reviewed' | 'Shortlisted' | 'Rejected' | 'Hired'
 * @returns {Promise<{success: boolean, message: string, data: Object}>}
 */
export async function updateApplicationStatus(applicationId, status) {
  if (!applicationId) throw new Error('Application ID is required');
  if (!status) throw new Error('Status is required');

  try {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update application status');
    }

    return data;
  } catch (error) {
    console.error(`Application API error in updateApplicationStatus(${applicationId}):`, error);
    throw error;
  }
}
