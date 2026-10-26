import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { getDBStatus } from '../config/db.js';

/**
 * Helper to ensure MongoDB is ready.
 */
const ensureDatabaseReady = (res) => {
  const dbStatus = getDBStatus();
  if (dbStatus.status !== 'connected') {
    res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable.',
      databaseStatus: dbStatus.status,
    });
    return false;
  }
  return true;
};

/**
 * @desc   Get current user's notifications with pagination
 * @route  GET /api/v1/notifications
 * @access Private (Authenticated users)
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('job', 'title company location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page,
      totalPages,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get unread notification count for current user
 * @route  GET /api/v1/notifications/unread-count
 * @access Private (Authenticated users)
 */
export const getUnreadNotificationCount = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark a single notification as read
 * @route  PATCH /api/v1/notifications/:id/read
 * @access Private (Owner only)
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Notification ID format',
      });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Ownership check: users can only update their own notifications
    if (!notification.recipient.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this notification',
      });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Mark all notifications as read for current user
 * @route  PATCH /api/v1/notifications/read-all
 * @access Private (Owner only)
 */
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    if (!ensureDatabaseReady(res)) return;

    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};
