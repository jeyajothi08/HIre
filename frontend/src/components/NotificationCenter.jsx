import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Briefcase,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  Inbox,
  X
} from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationCenter({
  user,
  onSelectJob,
  onOpenMyApplications,
  onOpenEmployerApplicants,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef(null);

  // Initial count check & background refresh interval (every 30s)
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    getUnreadCount()
      .then((count) => {
        if (isMounted) setUnreadCount(count);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      getUnreadCount()
        .then((count) => {
          if (isMounted) setUnreadCount(count);
        })
        .catch(() => {});
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Fetch notifications list when popover is opened
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications(1, 20);
      setNotifications(res.data || []);
      if (typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      loadNotifications();
    } else {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single item read
  const handleItemClick = async (notif) => {
    if (!notif.read) {
      try {
        await markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn('Failed to mark notification read:', err.message);
      }
    }

    // Contextual routing based on notification payload
    if (notif.job?._id && onSelectJob) {
      setIsOpen(false);
      onSelectJob(notif.job._id);
      return;
    }

    if (notif.type === 'new_application' && onOpenEmployerApplicants) {
      setIsOpen(false);
      onOpenEmployerApplicants();
      return;
    }

    if (notif.type === 'status_update' && onOpenMyApplications) {
      setIsOpen(false);
      onOpenMyApplications();
      return;
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-xl border transition-all text-slate-700 hover:text-slate-900 ${
          isOpen
            ? 'bg-slate-100 border-slate-300 shadow-inner'
            : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-xs'
        }`}
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {markingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
                <p className="text-xs font-medium">Checking live alerts...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                <p className="text-xs text-rose-700 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No notifications yet</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                  You are all caught up! You will be alerted here whenever candidates apply or your application review status changes.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isNewApp = notif.type === 'new_application';
                const isStatus = notif.type === 'status_update';

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      !notif.read ? 'bg-blue-50/30' : 'bg-white'
                    }`}
                  >
                    {/* Icon Indicator */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isNewApp
                          ? 'bg-blue-100 text-blue-700'
                          : isStatus
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isNewApp ? (
                        <Briefcase className="w-4 h-4" />
                      ) : isStatus ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5
                          className={`text-xs truncate ${
                            !notif.read
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </h5>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.job && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                          <span className="truncate">
                            {notif.job.company ? `${notif.job.company} • ` : ''}
                            {notif.job.title}
                          </span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </div>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>HireHub Live Alerts</span>
            <span>Real-time Event Stream</span>
          </div>
        </div>
      )}
    </div>
  );
}
