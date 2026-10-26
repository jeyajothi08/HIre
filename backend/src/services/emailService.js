import nodemailer from 'nodemailer';

// In-memory cache to prevent duplicate email deliveries on retries within a reasonable window
const sentEmailKeys = new Set();

/**
 * Check whether email delivery has been properly configured with external credentials.
 */
export const isEmailConfigured = () => {
  const provider = (process.env.EMAIL_PROVIDER || 'none').toLowerCase();
  if (provider === 'smtp') {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return Boolean(host && user && pass);
  }
  return false;
};

/**
 * Send an email alert if an email provider is configured.
 * Resilient: Never throws errors; returns delivery status safely.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.text - Plaintext body
 * @param {string} [options.html] - Optional HTML body
 * @param {string} [options.idempotencyKey] - Unique key to prevent duplicate email alerts
 * @returns {Promise<{ delivered: boolean, reason?: string, error?: string }>}
 */
export const sendEmailAlert = async ({ to, subject, text, html, idempotencyKey }) => {
  // Guard against missing recipient
  if (!to) {
    return { delivered: false, reason: 'missing_recipient' };
  }

  // Deduplication check for retried events
  if (idempotencyKey) {
    if (sentEmailKeys.has(idempotencyKey)) {
      return { delivered: false, reason: 'duplicate_suppressed' };
    }
  }

  const provider = (process.env.EMAIL_PROVIDER || 'none').toLowerCase();

  // If email provider is unconfigured or set to 'none'
  if (provider !== 'smtp' || !isEmailConfigured()) {
    // Record idempotency to prevent repeated debug processing
    if (idempotencyKey) sentEmailKeys.add(idempotencyKey);

    return {
      delivered: false,
      reason: 'provider_unconfigured',
      note: 'In-app notification created. External email skipped (no provider configured in .env).',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });

    const fromAddress = process.env.EMAIL_FROM || 'HireHub <no-reply@hirehub.dev>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: html || text,
    });

    if (idempotencyKey) {
      sentEmailKeys.add(idempotencyKey);
    }

    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    // Fail gracefully: Do not break in-app notification flow or application transaction
    console.warn(`[EmailService] Delivery failed to ${to}:`, error.message);
    return {
      delivered: false,
      reason: 'delivery_failed',
      error: error.message,
    };
  }
};
