const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Fetch current authenticated jobseeker's profile.
 */
export async function getMyProfile() {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch candidate profile');
  }
  return data;
}

/**
 * Update current authenticated jobseeker's profile.
 */
export async function updateMyProfile(profileData) {
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(profileData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.errors ? data.errors.join('. ') : (data.message || 'Failed to update profile');
    throw new Error(errorMsg);
  }
  return data;
}

/**
 * Upload or replace PDF resume.
 */
export async function uploadResume(file, onProgress) {
  if (!file) throw new Error('No file selected');

  const formData = new FormData();
  formData.append('resume', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/profile/resume`);
    xhr.withCredentials = true;

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || 'Failed to upload resume'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during resume upload'));
    xhr.send(formData);
  });
}

/**
 * Download jobseeker's own resume as a PDF blob.
 */
export async function downloadMyResume(filename = 'resume.pdf') {
  const response = await fetch(`${API_BASE_URL}/profile/resume`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to download resume');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Delete jobseeker's own resume.
 */
export async function deleteMyResume() {
  const response = await fetch(`${API_BASE_URL}/profile/resume`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete resume');
  }
  return data;
}

/**
 * Employer views candidate profile for an application.
 */
export async function getApplicationCandidateProfile(applicationId) {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/candidate-profile`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch candidate profile');
  }
  return data;
}

/**
 * Employer securely downloads candidate resume for an application.
 */
export async function downloadApplicationResume(applicationId, candidateName = 'candidate') {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/resume`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to download candidate resume');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedName = candidateName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  a.download = `${sanitizedName}_resume.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
