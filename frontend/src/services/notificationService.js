const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Fetch current user's notifications with pagination.
 */
export async function getNotifications(page = 1, limit = 10) {
  const response = await fetch(`${API_BASE_URL}/notifications?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch notifications');
  }
  return data;
}

/**
 * Fetch unread notification count for current user.
 */
export async function getUnreadCount() {
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch unread notification count');
  }
  return data.count || 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark notification as read');
  }
  return data;
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllAsRead() {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark all notifications as read');
  }
  return data;
}
