const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────────
// Klassic Group of Companies — transactional email via Nodemailer SMTP.
// ─────────────────────────────────────────────────────────────────────────────

const BRAND_NAME = String(process.env.APP_NAME || 'Klassic Group of Companies').trim();
const GOLD = '#C9A227';
const INK = '#141414';
const MUTED = '#6b7280';
const HAIRLINE = '#e5e7eb';

let transporter = null;

function isConfigured() {
  return Boolean(
    String(process.env.EMAIL_USER || '').trim() &&
    String(process.env.EMAIL_PASS || '').trim()
  );
}

function getTransporter() {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();

  if (!user || !pass) {
    const error = new Error(
      'Email is not configured. Set EMAIL_USER and EMAIL_PASS in .env.'
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return transporter;
}

async function verifyConnection() {
  try {
    const t = getTransporter();
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message || 'SMTP connection failed.' };
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

async function sendMail(message) {
  const t = getTransporter();
  const senderEmail = process.env.EMAIL_USER;
  const mailOptions = {
    ...message,
    from: `"${BRAND_NAME}" <${senderEmail}>`
  };

  const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
  if (replyTo && !mailOptions.replyTo) mailOptions.replyTo = replyTo;

  const info = await t.sendMail(mailOptions);
  return { messageId: info.messageId };
}

// ── Shared layout ────────────────────────────────────────────────────────────
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

  const intro = `We received your service booking, ${name}. Its current status is ${status}. A specialist will review the details and confirm your appointment. Keep the reference number below for any follow-up.`;

  return sendMail({
    to: booking && booking.email,
    subject: `Booking received — ${reference}`,
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
      heading: 'Your booking request was received',
      intro,
      rows,
      footnote: 'If any of these details look wrong, reply to this message and we will update the booking for you.'
    })
  });
}

function sendCampaignEmail(recipient, subject, message) {
  const name = String((recipient && recipient.name) || '').trim() || 'Client';
  const bodyText = String(message || '').trim();
  const bodyHtml = escapeHtml(bodyText).replace(/\r\n|\r|\n/g, '<br>');
  const intro = `Hello ${name},`;

  return sendMail({
    to: recipient && recipient.email,
    subject: String(subject || '').trim(),
    text: `${intro}\n\n${bodyText}\n\nThank you,\n${BRAND_NAME}`,
    html: renderLayout({
      heading: String(subject || '').trim(),
      intro,
      rows: [{ label: 'Message', html: `<div style="line-height:1.7;">${bodyHtml}</div>` }],
      footnote: 'You are receiving this message because you have a KGC client account.'
    })
  });
}

function sendBookingStatusUpdate(booking) {
  const name = (booking && booking.name) || 'there';
  const reference = (booking && booking.id) || 'Not available';
  const status = (booking && booking.status) || 'Pending';
  const approved = String(status).toLowerCase() === 'approved';
  const grouped = describeServices(booking && booking.services);
  const subsidiaries = Array.isArray(booking && booking.subsidiaries) ? booking.subsidiaries : [];
  const serviceRows = grouped.length
    ? grouped.map((group) => ({ label: group.subsidiary, value: group.services.join(', ') }))
    : (subsidiaries.length
      ? [{ label: 'Subsidiary', value: subsidiaries.join(', ') }]
      : [{ label: 'Service', value: 'Not specified' }]);
  const intro = approved
    ? `Hello ${name}, your booking has been approved. Please keep the reference number below for your records.`
    : `Hello ${name}, your booking request was declined. Contact our team if you would like to discuss other options.`;

  return sendMail({
    to: booking && booking.email,
    subject: `Booking ${approved ? 'approved' : 'declined'} — ${reference}`,
    text: [
      intro,
      '',
      `Reference number: ${reference}`,
      `Status: ${status}`,
      ...serviceRows.map((row) => `${row.label}: ${row.value}`),
      '',
      BRAND_NAME
    ].join('\n'),
    html: renderLayout({
      heading: approved ? 'Your booking has been approved' : 'Booking status update',
      intro,
      rows: [
        { label: 'Reference number', html: `<strong style="font-family:monospace;">${escapeHtml(reference)}</strong>` },
        { label: 'Status', html: `<strong>${escapeHtml(status)}</strong>` },
        ...serviceRows
      ],
      footnote: 'You can view the latest status and message our team in your KGC client portal.'
    })
  });
}

function sendRegistrationVerificationCode(email, name, code) {
  const greeting = String(name || '').trim() || 'there';
  return sendMail({
    to: email,
    subject: `Verify your email — ${BRAND_NAME}`,
    text: [
      `Hello ${greeting},`,
      '',
      `Your KGC email verification code is ${code}.`,
      'The code expires in 10 minutes. If you did not request this, you can ignore this email.',
      '',
      BRAND_NAME
    ].join('\n'),
    html: renderLayout({
      heading: 'Verify your email address',
      intro: `Hello ${greeting}. Use the verification code below to finish creating your KGC account.`,
      rows: [{ label: 'Verification code', html: `<strong style="font-family:monospace;font-size:24px;letter-spacing:5px;">${escapeHtml(code)}</strong>` }],
      footnote: 'This code expires in 10 minutes. If you did not request this, you can ignore this email.'
    })
  });
}

module.exports = {
  isConfigured,
  verifyConnection,
  sendMail,
  sendWelcomeEmail,
  sendBookingConfirmation,
  sendBookingStatusUpdate,
  sendCampaignEmail,
  sendRegistrationVerificationCode,
  formatBookingDate
};