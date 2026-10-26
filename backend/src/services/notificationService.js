import Notification from '../models/Notification.js';
import { sendEmailAlert } from './emailService.js';

/**
 * Creates an in-app notification and optionally dispatches an external email alert.
 * Prevents duplicates on retried requests via idempotencyKey.
 * Resilient: Never throws or breaks calling transactions.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.recipient - Recipient user ID
 * @param {string} params.type - 'new_application' | 'status_update' | 'system'
 * @param {string} params.title - Short title
 * @param {string} params.message - Full message text
 * @param {string|mongoose.Types.ObjectId} [params.job] - Associated Job ID
 * @param {string|mongoose.Types.ObjectId} [params.application] - Associated Application ID
 * @param {string} [params.idempotencyKey] - Unique deduplication key
 * @param {string} [params.recipientEmail] - Recipient email address for email alerts
 * @returns {Promise<Notification|null>}
 */
export const createNotification = async ({
  recipient,
  type = 'system',
  title,
  message,
  job = null,
  application = null,
  idempotencyKey = null,
  recipientEmail = null,
}) => {
  try {
    if (!recipient || !title || !message) {
      console.warn('[NotificationService] Missing required fields for notification');
      return null;
    }

    // 1. Deduplication check: Avoid duplicate notifications if request is retried
    if (idempotencyKey) {
      const existing = await Notification.findOne({ idempotencyKey });
      if (existing) {
        return existing;
      }
    }

    // 2. Create in-app notification in database
    const notification = await Notification.create({
      recipient,
      type,
      title: title.trim(),
      message: message.trim(),
      job,
      application,
      idempotencyKey,
      read: false,
    });

    // 3. Optional asynchronous email alert (non-blocking)
    if (recipientEmail) {
      sendEmailAlert({
        to: recipientEmail,
        subject: `[HireHub] ${title}`,
        text: message,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">This is an automated notification from HireHub Job Portal.</p>
          </div>
        `,
        idempotencyKey: idempotencyKey ? `email_${idempotencyKey}` : undefined,
      }).catch((err) => {
        console.warn('[NotificationService] Background email alert failed:', err.message);
      });
    }

    return notification;
  } catch (error) {
    // Check if error was duplicate key collision on idempotencyKey
    if (error.code === 11000 && idempotencyKey) {
      return await Notification.findOne({ idempotencyKey });
    }
    console.error('[NotificationService] Failed to create notification:', error.message);
    return null;
  }
};
