const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Register a new user account (Job Seeker or Employer).
 * Uses credentials: 'include' so that the server's httpOnly authentication
 * cookie is automatically stored in the browser session.
 * 
 * @param {Object} credentials - { name, email, password, role }
 * @returns {Promise<{success: boolean, message: string, data: Object}>}
 */
export async function register({ name, email, password, role = 'jobseeker' }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.errors ? data.errors.join('. ') : (data.message || 'Registration failed');
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Log in an existing user with email and password.
 * Receives and establishes the secure httpOnly cookie session.
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{success: boolean, message: string, data: Object}>}
 */
export async function login({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Invalid email or password');
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Log out the current user session.
 * Clears the server's httpOnly authentication cookie.
 * 
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function logout() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));
    return data;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Fetch the currently authenticated user's profile.
 * Automatically transmits the httpOnly cookie.
 * 
 * @returns {Promise<{success: boolean, data: Object}|null>} Returns user object or null if guest
 */
export async function getMe() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch {
    // If backend is unavailable or unauthenticated, degrade gracefully to guest
    return null;
  }
}
