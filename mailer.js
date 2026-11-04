const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────────
// Klassic Group of Companies — transactional email
//
// Ground rules:
//  1. Nothing here may throw at require() time. A missing SMTP configuration
//     must degrade to a logged warning, never crash the server on boot.
//  2. sendMail() is the only function that touches the network. Callers fire it
//     through queueEmail() in server.js, so a slow or unreachable SMTP host can
//     never delay or fail an HTTP response.
//  3. Every send is retried once on a transient failure, but never on an auth
//     rejection (retrying a bad password just gets the account rate-limited).
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_NAME = String(process.env.APP_NAME || 'Klassic Group of Companies').trim();
const GOLD = '#C9A227';
const INK = '#141414';
const MUTED = '#6b7280';
const HAIRLINE = '#e5e7eb';

let transporter = null;
let cachedConfig;          // undefined = not read yet, null = not configured
let configWarningShown = false;

function readConfig() {
  if (cachedConfig !== undefined) return cachedConfig;

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  const from = String(process.env.SMTP_FROM || user || '').trim();
  const replyTo = String(process.env.SMTP_REPLY_TO || '').trim();

  const validPort = Number.isInteger(port) && port > 0 && port < 65536;
  const authIncomplete = (user && !pass) || (!user && pass);

  if (!host || !from || !validPort || authIncomplete) {
    cachedConfig = null;
    return cachedConfig;
  }

  cachedConfig = {
    host,
    port,
    user,
    pass,
    from,
    replyTo,
    secure: process.env.SMTP_SECURE === undefined
      ? port === 465
      : String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  };
  return cachedConfig;
}

function isConfigured() {
  return readConfig() !== null;
}

function getTransporter() {
  if (transporter) return transporter;

  const config = readConfig();
  if (!config) {
    const error = new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM (or SMTP_USER) in .env.'
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user ? { auth: { user: config.user, pass: config.pass } } : {}),
    // Pooling keeps campaign sends from opening a new connection per message.
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });

  return transporter;
}

// Non-fatal connectivity probe. Useful once at startup or from an admin screen.
async function verifyConnection() {
  if (!isConfigured()) return { ok: false, reason: 'Email is not configured.' };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "2026-10-14" → "October 14, 2026". Parsed from the leading Y-M-D parts so a
// UTC timestamp can never shift the day in a negative-offset timezone.
function formatBookingDate(value) {
  if (!value) return 'Not specified';
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return text;
}

function isRetryable(error) {
  const code = String((error && error.code) || '');
  const responseCode = String((error && error.responseCode) || '');
  if (code === 'EMAIL_NOT_CONFIGURED' || code === 'EAUTH') return false;
  if (responseCode === '534' || responseCode === '535') return false;   // auth rejected
  return true;
}

/**
 * Sends one message, retrying once on a transient failure.
 * Throws on permanent failure so the caller can log it — callers in server.js
 * run inside queueEmail() and therefore never block the HTTP response.
 */
async function sendMail(message, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || 2);
  const config = readConfig();
  if (!config) {
    const error = new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM (or SMTP_USER) in .env.'
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const mail = getTransporter();
      const info = await mail.sendMail({
        from: config.from,
        ...(config.replyTo ? { replyTo: config.replyTo } : {}),
        ...message
      });
      return { messageId: info.messageId, accepted: info.accepted, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryable(error)) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw lastError;
}

// ── Shared layout ────────────────────────────────────────────────────────────
// Table-based with inline styles only: email clients strip <style> blocks and
// ignore modern layout, so this is deliberately old-fashioned.
function renderLayout({ heading, intro, rows, footnote }) {
  const list = Array.isArray(rows) ? rows : [];
  const body = list.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">` +
      list.map((row) => (
        `<tr>` +
        `<td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:13px;color:${MUTED};` +
        `width:42%;vertical-align:top;">${escapeHtml(row.label)}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:14px;color:${INK};` +
        `vertical-align:top;">${row.html != null ? row.html : escapeHtml(row.value)}</td>` +
        `</tr>`
      )).join('') +
      `</table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};border-radius:10px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background:${INK};padding:22px 26px;">
            <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">${escapeHtml(BRAND_NAME)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 26px 8px;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${INK};">${escapeHtml(heading)}</h1>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(intro)}</p>
            ${body}
            ${footnote ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">${escapeHtml(footnote)}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 26px 26px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
              Thank you,<br><strong style="color:${INK};">${escapeHtml(BRAND_NAME)}</strong>
            </p>
          </td>
        </tr>
      </table>
      <div style="max-width:560px;margin:14px auto 0;font-size:11px;color:#9ca3af;text-align:center;">
        This is an automated message — please do not reply directly to it.
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Welcome email ────────────────────────────────────────────────────────────
function sendWelcomeEmail(user) {
  const name = (user && user.name) || 'there';
  const isPendingAdmin = user && user.role === 'admin' && user.status === 'Pending Approval';

  const intro = isPendingAdmin
    ? `Thanks for requesting administrator access, ${name}. Your account is created and is now awaiting approval from an existing administrator. We will email you as soon as it has been reviewed.`
    : `Thanks for creating an account, ${name}. Your Klassic Group of Companies portal account is ready — you can sign in and book a consultation at any time.`;

  const rows = [
    { label: 'Account email', value: user && user.email },
    { label: 'Account type', value: isPendingAdmin ? 'Administrator (pending approval)' : 'Client' },
    { label: 'Status', value: (user && user.status) || (isPendingAdmin ? 'Pending Approval' : 'Approved') }
  ];

  return sendMail({
    to: user && user.email,
    subject: isPendingAdmin
      ? `Admin access requested — ${BRAND_NAME}`
      : `Welcome to ${BRAND_NAME}`,
    text: [
      `Hello ${name},`,
      '',
      intro,
      '',
      `Account email: ${(user && user.email) || ''}`,
      `Status: ${(user && user.status) || 'Approved'}`,
      '',
      'Thank you,',
      BRAND_NAME
    ].join('\n'),
    html: renderLayout({
      heading: isPendingAdmin ? 'Your admin request is pending' : `Welcome aboard, ${name}`,
      intro,
      rows,
      footnote: isPendingAdmin
        ? 'You will not be able to sign in until an administrator approves this request.'
        : null
    })
  });
}

// ── Booking confirmation ─────────────────────────────────────────────────────
function describeServices(services) {
  const map = services && typeof services === 'object' ? services : {};
  const lines = [];
  Object.keys(map).forEach((subsidiary) => {
    const values = Array.isArray(map[subsidiary]) ? map[subsidiary] : [map[subsidiary]];
    const cleaned = values.map((v) => String(v || '').trim()).filter(Boolean);
    if (cleaned.length) lines.push({ subsidiary, services: cleaned });
  });
  return lines;
}

function sendBookingConfirmation(booking) {
  const name = (booking && booking.name) || 'there';
  const reference = (booking && booking.id) || 'Not available';
  const status = (booking && booking.status) || 'Pending';
  const grouped = describeServices(booking && booking.services);
  const subsidiaries = Array.isArray(booking && booking.subsidiaries) ? booking.subsidiaries : [];

  // Prefer the explicit service list; fall back to the subsidiary names.
  const serviceRows = grouped.length
    ? grouped.map((group) => ({
      label: group.subsidiary,
      value: group.services.join(', ')
    }))
    : (subsidiaries.length
      ? [{ label: 'Subsidiary', value: subsidiaries.join(', ') }]
      : [{ label: 'Service', value: 'Not specified' }]);

  const rows = [
    { label: 'Reference number', html: `<strong style="font-family:monospace;">${escapeHtml(reference)}</strong>` },
    { label: 'Status', html: `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;">${escapeHtml(status)}</span>` },
    ...serviceRows,
    { label: 'Payment method', value: (booking && booking.paymentMethod) || 'Not specified' },
    { label: 'Preferred date', value: formatBookingDate(booking && booking.date) }
  ];

  if (booking && booking.timeSlot) rows.push({ label: 'Time slot', value: booking.timeSlot });
  if (booking && booking.meetingFormat) rows.push({ label: 'Meeting format', value: booking.meetingFormat });
  if (booking && booking.notes) rows.push({ label: 'Your notes', value: booking.notes });

  const intro = `We received your service booking, ${name}. A specialist will review the details and confirm your appointment. Keep the reference number below for any follow-up.`;

  return sendMail({
    to: booking && booking.email,
    subject: `Booking confirmed — ${reference}`,
    text: [
      `Hello ${name},`,
      '',
      intro,
      '',
      `Reference number: ${reference}`,
      `Status: ${status}`,
      ...serviceRows.map((row) => `${row.label}: ${row.value}`),
      `Payment method: ${(booking && booking.paymentMethod) || 'Not specified'}`,
      `Preferred date: ${formatBookingDate(booking && booking.date)}`,
      ...(booking && booking.timeSlot ? [`Time slot: ${booking.timeSlot}`] : []),
      ...(booking && booking.meetingFormat ? [`Meeting format: ${booking.meetingFormat}`] : []),
      ...(booking && booking.notes ? [`Notes: ${booking.notes}`] : []),
      '',
      'Thank you,',
      BRAND_NAME
    ].join('\n'),
    html: renderLayout({
      heading: 'Your booking is confirmed',
      intro,
      rows,
      footnote: 'If any of these details look wrong, reply to this message and we will update the booking for you.'
    })
  });
}

module.exports = {
  isConfigured,
  verifyConnection,
  sendMail,
  sendWelcomeEmail,
  sendBookingConfirmation,
  formatBookingDate
};
