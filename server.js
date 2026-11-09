const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createSupabaseStore } = require('./supabase-store');

// Load environment variables from .env file
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
  }
} catch (err) {
  console.log('dotenv not found, using default values');
}

const mailer = require('./mailer');

const KGC_CAMPAIGN_SUBSIDIARIES = [
  'Brains Infinite Innovations Inc.',
  'Klassic Solutions Inc.',
  'Klassic Marketing Inc.',
  'Westwood Development Corp.',
  'Westwood Law',
  'Connector',
  'The Green Oasis',
  'Luxurious Cleaning Co.',
  'HYT Foundation Inc.',
  'The Finest Fit'
];
const CAMPAIGN_EXCLUDED_STATUSES = new Set([
  'inactive', 'disabled', 'rejected', 'deleted', 'archived', 'unsubscribed'
]);
const CAMPAIGN_VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isCampaignDeliverableAddress(value) {
  const email = normalizeEmail(value);
  if (!CAMPAIGN_VALID_EMAIL.test(email)) return false;
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return domain !== 'example.com' && domain !== 'example.net' && domain !== 'example.org' &&
    !/\.(?:example|invalid|test|localhost)$/.test(domain);
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Durable JSON-backed persistence under data/ with fallback to legacy root files
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKING_MESSAGES_FILE = path.join(DATA_DIR, 'booking-messages.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const LEGACY_BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const LEGACY_USERS_FILE = path.join(__dirname, 'users.json');
const IS_DEPLOYED_ENVIRONMENT = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

const DEMO_USERS = IS_DEPLOYED_ENVIRONMENT ? [] : [
  { id: 'demo-client', role: 'client', name: 'Client User', email: 'client@kgc.ph', password: 'password', isApproved: true, status: 'Approved' },
  { id: 'demo-admin', role: 'admin', name: 'Admin User', email: 'admin@kgc.ph', password: 'password', isApproved: true, status: 'Approved' }
];

// ── In-memory bookings store (seeded from disk on startup) ──────────────────
let bookingsStore = [];
let usersStore = [];
let bookingMessagesStore = [];
let notificationsStore = [];

function ensureDataDirectory() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('⚠️  Could not create data directory:', err.message);
  }
}

function loadBookingsFromDisk() {
  try {
    ensureDataDirectory();
    const sourceFile = fs.existsSync(BOOKINGS_FILE) ? BOOKINGS_FILE : LEGACY_BOOKINGS_FILE;
    if (fs.existsSync(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf8');
      bookingsStore = JSON.parse(raw) || [];
      if (sourceFile === LEGACY_BOOKINGS_FILE && !fs.existsSync(BOOKINGS_FILE)) {
        saveBookingsToDisk();
      }
      console.log(`📂 Loaded ${bookingsStore.length} booking(s) from ${path.basename(sourceFile)}`);
    }
  } catch (err) {
    console.warn('⚠️  Could not read bookings data, starting fresh:', err.message);
    bookingsStore = [];
  }
}

function saveBookingsToDisk() {
  try {
    ensureDataDirectory();
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookingsStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  Could not save bookings.json:', err.message);
  }
}

function loadUsersFromDisk() {
  try {
    ensureDataDirectory();
    const sourceFile = fs.existsSync(USERS_FILE) ? USERS_FILE : LEGACY_USERS_FILE;
    if (fs.existsSync(sourceFile)) {
      const raw = fs.readFileSync(sourceFile, 'utf8');
      const parsed = JSON.parse(raw) || [];
      usersStore = dedupeUsers(parsed);
      if (usersStore.length !== parsed.length) {
        console.warn(`⚠️  Removed ${parsed.length - usersStore.length} duplicate account row(s) from ${path.basename(sourceFile)}`);
      }
      if ((sourceFile === LEGACY_USERS_FILE && !fs.existsSync(USERS_FILE)) ||
          usersStore.length !== parsed.length) {
        saveUsersToDisk();
      }
      console.log(`👤 Loaded ${usersStore.length} registered user(s) from ${path.basename(sourceFile)}`);
    }
  } catch (err) {
    console.warn('⚠️  Could not read users data, starting fresh:', err.message);
    usersStore = [];
  }
}

function saveUsersToDisk() {
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Could not save users.json:', err);
    return false;
  }
}

function normalizeRole(value) {
  return String(value || 'client').trim().toLowerCase() === 'admin' ? 'admin' : 'client';
}

function getApprovalStatus(user) {
  if (!user) return false;
  if (String(user.role || 'client').trim().toLowerCase() !== 'admin') return true;
  const status = String(user.status || '').trim().toLowerCase();
  return user.isApproved !== false &&
    !['pending', 'pending approval', 'suspended', 'inactive', 'disabled', 'rejected', 'deleted', 'archived'].includes(status);
}

// ── Email identity helpers ───────────────────────────────────────────────────
// Every email comparison must go through normalizeEmail() so that
// "User@Email.com ", "user@email.com" and "USER@EMAIL.COM" are one identity.
function normalizeEmail(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

// Rows that must NOT block a new registration: blank/garbage emails left behind
// by older imports, plus accounts that were explicitly rejected, deleted or
// archived. These are the "phantom records" that produced false duplicates.
function isBlockingAccount(user) {
  if (!user) return false;
  if (normalizeEmail(user.email) === '') return false;   // a blank email can never collide
  const status = String(user.status || '').trim().toLowerCase();
  if (status === 'rejected' || status === 'deleted' || status === 'archived') return false;
  return true;
}

// Returns the existing live account for an email, or null. Case-insensitive.
function findAccountByEmail(email, users) {
  const target = normalizeEmail(email);
  if (!target) return null;
  const list = Array.isArray(users) ? users : [];
  return list.find((user) => isBlockingAccount(user) && normalizeEmail(user.email) === target) || null;
}

// Collapse rows that share an email (case-insensitive). Older versions pushed the
// same object twice per registration, which is how duplicates got into the file.
function dedupeUsers(list) {
  const seen = new Map();
  (Array.isArray(list) ? list : []).forEach((user) => {
    if (!user) return;
    const key = normalizeEmail(user.email) || ('id:' + String(user.id || ''));
    const current = seen.get(key);
    if (!current) { seen.set(key, user); return; }
    // Keep the live/approved row when two copies disagree.
    if (!getApprovalStatus(current) && getApprovalStatus(user)) seen.set(key, user);
  });
  return Array.from(seen.values());
}

function isUniqueViolation(error) {
  if (!error) return false;
  const code = String(error.code || error.status || '');
  const message = String(error.message || '');
  return code === '23505' || /duplicate key value|unique constraint|already exists/i.test(message);
}

async function findUserByCredentials(email, password, role = 'client', users = usersStore) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  const candidates = users.concat(DEMO_USERS).filter((user) =>
    String(user.email || '').trim().toLowerCase() === normalizedEmail &&
    normalizeRole(user.role || 'client') === normalizedRole
  );
  for (const candidate of candidates) {
    if (await verifyPassword(password, candidate.password)) return candidate;
  }
  return null;
}

async function getUsersByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (supabaseStore.enabled) {
    try {
      return await supabaseStore.findUsersByEmail(normalizedEmail);
    } catch (error) {
      if (IS_DEPLOYED_ENVIRONMENT) {
        console.error('Supabase user lookup failed:', error);
        throw error;
      }
      console.warn('Supabase user lookup failed; using JSON fallback:', error.message);
    }
  }
  return usersStore.filter((user) =>
    String(user.email || '').trim().toLowerCase() === normalizedEmail
  );
}

function isSupabaseCredentialRejection(error) {
  const code = String(error && error.code || '').toLowerCase();
  const status = Number(error && error.status);
  const message = String(error && error.message || '');
  return code === 'invalid_credentials' ||
    (status === 400 && /invalid login credentials/i.test(message));
}

loadBookingsFromDisk();
loadUsersFromDisk();
try {
  if (fs.existsSync(BOOKING_MESSAGES_FILE)) {
    bookingMessagesStore = JSON.parse(fs.readFileSync(BOOKING_MESSAGES_FILE, 'utf8')) || [];
  }
} catch (error) {
  console.warn('Could not read booking messages:', error.message);
  bookingMessagesStore = [];
}
try {
  if (fs.existsSync(NOTIFICATIONS_FILE)) {
    notificationsStore = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8')) || [];
  }
} catch (error) {
  console.warn('Could not read notifications:', error.message);
  notificationsStore = [];
}

const supabaseStore = createSupabaseStore();
const ADMIN_SESSION_COOKIE = 'kgc_admin_session';
const CLIENT_SESSION_COOKIE = 'kgc_client_session';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_SESSION_SECRET = String(process.env.ADMIN_SESSION_SECRET || '').trim() ||
  (IS_DEPLOYED_ENVIRONMENT ? '' : crypto.randomBytes(32).toString('hex'));
const clientSessions = new Map();
const registrationChallenges = new Map();
const registrationSendTimes = new Map();
const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REGISTRATION_CODE_TTL_MS = 10 * 60 * 1000;
const REGISTRATION_CODE_RESEND_MS = 60 * 1000;
const REGISTRATION_CODE_MAX_ATTEMPTS = 5;

function queueEmail(label, send) {
  // Keep email network work off the HTTP response path and handle every failure.
  setImmediate(() => {
    Promise.resolve()
      .then(send)
      .then(() => console.log(`✉️  ${label} email sent`))
      .catch((error) => console.warn(`Email delivery failed (${label}):`, error.message));
  });
}

function saveNotificationsToDisk() {
  ensureDataDirectory();
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notificationsStore, null, 2), 'utf8');
}

async function persistNotification(notification) {
  if (supabaseStore.enabled) {
    const saved = await supabaseStore.insertNotification(notification);
    return saved || notification;
  }
  const existing = notificationsStore.find((entry) => entry.eventKey === notification.eventKey);
  if (existing) return existing;
  notificationsStore.push(notification);
  saveNotificationsToDisk();
  return notification;
}

async function createBookingNotification(options) {
  const recipientEmail = normalizeEmail(options.recipientEmail);
  const recipientId = String(options.recipientId || '');
  const eventKey = `${options.eventKey}:${recipientId || recipientEmail}`;
  const notification = {
    id: crypto.randomUUID(),
    eventKey,
    recipientRole: options.recipientRole,
    recipientId,
    recipientEmail,
    type: options.type,
    title: options.title,
    body: options.body,
    bookingId: String(options.bookingId || ''),
    createdAt: new Date().toISOString(),
    readAt: null
  };
  return persistNotification(notification);
}

async function notifyAdminsOfBookingEvent(options) {
  const admins = (await getUsersStore()).concat(DEMO_USERS)
    .filter((user) => normalizeRole(user.role) === 'admin' && getApprovalStatus(user));
  const recipients = Array.from(new Map(admins.map((admin) => [String(admin.id), admin])).values());
  await Promise.all(recipients.map((admin) => createBookingNotification({
    recipientRole: 'admin',
    recipientId: admin.id,
    recipientEmail: admin.email,
    type: options.type,
    title: options.title,
    body: options.body,
    bookingId: options.bookingId,
    eventKey: options.eventKey
  })));
}

async function listActorNotifications(actor) {
  const notifications = supabaseStore.enabled
    ? await supabaseStore.listNotifications(actor.role, actor.id, normalizeEmail(actor.email))
    : notificationsStore;
  return notifications.filter((notification) =>
    notification.recipientRole === actor.role &&
    ((notification.recipientId && String(notification.recipientId) === String(actor.id)) ||
      (notification.recipientEmail && normalizeEmail(notification.recipientEmail) === normalizeEmail(actor.email)))
  ).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, 100);
}

async function getBookingsStore() {
  if (supabaseStore.enabled) {
    try {
      bookingsStore = await supabaseStore.listBookings();
    } catch (error) {
      console.warn('Supabase bookings read failed; using JSON fallback:', error.message);
    }
  }
  return bookingsStore;
}

async function getUsersStore() {
  if (supabaseStore.enabled) {
    try {
      usersStore = await supabaseStore.listUsers();
    } catch (error) {
      console.warn('Supabase users read failed; using JSON fallback:', error.message);
    }
  }
  return usersStore;
}

async function getCampaignRecipientData() {
  let accounts = usersStore
    .filter((user) => normalizeRole(user.role) === 'client')
    .map((user) => ({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      status: user.status || '',
      isApproved: user.isApproved
    }));

  if (supabaseStore.enabled) {
    try {
      accounts = await supabaseStore.listClientAccounts();
    } catch (error) {
      console.warn('Supabase campaign recipient read failed; using JSON fallback:', error.message);
    }
  }

  let bookings = bookingsStore;
  if (supabaseStore.enabled && supabaseStore.listCampaignBookingAssociations) {
    try {
      bookings = await supabaseStore.listCampaignBookingAssociations();
    } catch (error) {
      console.warn('Supabase campaign subsidiary lookup failed; using local booking data:', error.message);
    }
  }

  const subsidiariesByEmail = new Map();
  bookings.forEach((booking) => {
    const email = normalizeEmail(booking.email);
    if (!email) return;
    const subsidiaries = Array.isArray(booking.subsidiaries) ? booking.subsidiaries : [];
    if (!subsidiariesByEmail.has(email)) subsidiariesByEmail.set(email, new Set());
    subsidiaries.forEach((subsidiary) => {
      const name = String(subsidiary || '').trim();
      if (name) subsidiariesByEmail.get(email).add(name);
    });
  });

  const recipients = Array.from(new Map(accounts
    .filter((account) => {
      const email = normalizeEmail(account.email);
      const status = String(account.status || '').trim().toLowerCase();
      return isCampaignDeliverableAddress(email) && account.isApproved !== false &&
        !CAMPAIGN_EXCLUDED_STATUSES.has(status);
    })
    .map((account) => {
      const email = normalizeEmail(account.email);
      const subsidiaries = subsidiariesByEmail.get(email) || new Set();
      return [email, {
        id: String(account.id || email),
        name: String(account.name || '').trim() || email,
        email,
        subsidiaries: Array.from(subsidiaries)
      }];
    })).values());

  const subsidiaryNames = new Map(KGC_CAMPAIGN_SUBSIDIARIES.map((name) => [name.toLowerCase(), name]));
  recipients.forEach((recipient) => recipient.subsidiaries.forEach((name) => {
    const key = name.toLowerCase();
    if (!subsidiaryNames.has(key)) subsidiaryNames.set(key, name);
  }));
  const subsidiaries = Array.from(subsidiaryNames.values()).sort((left, right) => left.localeCompare(right));

  return { recipients, subsidiaries };
}

function getCookieValue(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.find((entry) => entry.trim().startsWith(name + '='));
  return cookie ? cookie.trim().slice(name.length + 1) : '';
}

function createAdminSessionToken(userId) {
  if (!ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET must be configured in production.');
  const payload = Buffer.from(JSON.stringify({
    userId: String(userId),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!ADMIN_SESSION_SECRET || !token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.userId || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch (error) {
    return null;
  }
}

function setAdminSessionCookie(res, token, maxAgeSeconds) {
  const secure = IS_DEPLOYED_ENVIRONMENT ? '; Secure' : '';
  appendSessionCookie(res,
    `${ADMIN_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

function setClientSessionCookie(res, token, maxAgeSeconds) {
  const secure = IS_DEPLOYED_ENVIRONMENT ? '; Secure' : '';
  appendSessionCookie(res,
    `${CLIENT_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

function appendSessionCookie(res, cookie) {
  const current = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', current ? [].concat(current, cookie) : cookie);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || '');
  const parts = stored.split('$');
  if (parts.length === 3 && parts[0] === 'scrypt') {
    const expected = Buffer.from(parts[2], 'hex');
    return new Promise((resolve, reject) => {
      crypto.scrypt(String(password), parts[1], expected.length, (error, derivedKey) => {
        if (error) return reject(error);
        resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
      });
    });
  }
  return Promise.resolve(stored === String(password || ''));
}

function isActiveClient(user) {
  const status = String(user && user.status || '').trim().toLowerCase();
  return user && normalizeRole(user.role) === 'client' && user.isApproved !== false &&
    !['inactive', 'disabled', 'rejected', 'deleted', 'archived', 'suspended', 'pending', 'pending approval', 'unverified', 'pending verification'].includes(status);
}

async function authenticateSupabaseClient(accessToken) {
  if (!supabaseStore.enabled || !supabaseStore.authenticateClient) return null;
  const authUser = await supabaseStore.authenticateClient(accessToken);
  if (!authUser || authUser.emailConfirmed !== true) return null;
  const email = normalizeEmail(authUser && authUser.email);
  if (!email) return null;
  const accounts = await getUsersByEmail(email);
  const account = accounts.find(isActiveClient);
  if (!account) return null;
  return { id: String(account.id), email, name: String(account.name || authUser.name || 'Client') };
}

async function requireAdminSession(req, res, next) {
  const token = getCookieValue(req, ADMIN_SESSION_COOKIE);
  const session = verifyAdminSessionToken(token);
  if (!session) {
    setAdminSessionCookie(res, '', 0);
    return res.status(401).json({ success: false, error: 'Admin sign-in is required. Please sign in again.' });
  }

  try {
    const currentUsers = (await getUsersStore()).concat(DEMO_USERS);
    const admin = currentUsers.find((user) =>
      String(user.id) === String(session.userId) &&
      normalizeRole(user.role) === 'admin' &&
      getApprovalStatus(user)
    );
    if (!admin) {
      setAdminSessionCookie(res, '', 0);
      return res.status(403).json({ success: false, error: 'This admin account is no longer authorized.' });
    }
    req.adminUserId = admin.id;
    req.adminUser = admin;
    return next();
  } catch (error) {
    console.error('Admin session verification failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to verify admin access.' });
  }
}

async function requireBookingAccess(req, res, next) {
  const adminToken = getCookieValue(req, ADMIN_SESSION_COOKIE);
  const adminSession = verifyAdminSessionToken(adminToken);
  if (adminSession) {
    try {
      const users = (await getUsersStore()).concat(DEMO_USERS);
      const admin = users.find((user) => String(user.id) === String(adminSession.userId) &&
        normalizeRole(user.role) === 'admin' && getApprovalStatus(user));
      if (!admin) {
        setAdminSessionCookie(res, '', 0);
        return res.status(403).json({ success: false, error: 'Admin access is no longer authorized.' });
      }
      req.portalActor = { role: 'admin', id: String(admin.id), email: normalizeEmail(admin.email), name: admin.name || 'Admin' };
      return next();
    } catch (error) {
      console.error('Booking admin authorization failed:', error);
      return res.status(500).json({ success: false, error: 'Unable to verify dashboard access.' });
    }
  }

  const authHeader = String(req.headers.authorization || '');
  const bearer = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (bearer) {
    try {
      const actor = await authenticateSupabaseClient(bearer[1]);
      if (actor) {
        req.portalActor = Object.assign({ role: 'client' }, actor);
        return next();
      }
    } catch (error) {
      console.warn('Supabase client token verification failed:', error.message);
    }
  }

  const clientToken = getCookieValue(req, CLIENT_SESSION_COOKIE);
  const session = clientToken && clientSessions.get(clientToken);
  if (session && session.expiresAt > Date.now()) {
    try {
      const users = (await getUsersStore()).concat(DEMO_USERS);
      const user = users.find((entry) => String(entry.id) === session.userId && isActiveClient(entry));
      if (user && normalizeEmail(user.email) === session.email) {
        req.portalActor = {
          role: 'client',
          id: String(user.id),
          email: session.email,
          name: String(user.name || 'Client')
        };
        return next();
      }
    } catch (error) {
      console.error('Client session verification failed:', error);
      return res.status(500).json({ success: false, error: 'Unable to verify client access.' });
    }
  }

  if (clientToken) clientSessions.delete(clientToken);
  setClientSessionCookie(res, '', 0);
  return res.status(401).json({ success: false, error: 'Sign in to access your bookings.' });
}

async function resolveAccessibleBooking(req, bookingId) {
  const bookings = await getBookingsStore();
  const booking = bookings.find((entry) => String(entry.id) === String(bookingId));
  if (!booking) return { error: 'Booking not found.', status: 404 };
  if (req.portalActor.role !== 'admin' && normalizeEmail(booking.email) !== req.portalActor.email) {
    return { error: 'You do not have access to this booking.', status: 403 };
  }
  return { booking };
}

// Insert or replace a booking in the in-memory store, keyed by id, so one
// submission can never become two rows (and therefore two admin table entries).
function upsertBookingInMemory(booking) {
  if (!booking) return null;
  const idx = bookingsStore.findIndex((entry) => entry && entry.id === booking.id);
  if (idx >= 0) bookingsStore[idx] = Object.assign({}, bookingsStore[idx], booking);
  else bookingsStore.push(booking);
  return booking;
}

async function persistBooking(booking) {
  if (supabaseStore.enabled) {
    try {
      const saved = await supabaseStore.insertBooking(booking);
      upsertBookingInMemory(saved);
      return saved;
    } catch (error) {
      console.warn('Supabase booking write failed; using JSON fallback:', error.message);
    }
  }
  upsertBookingInMemory(booking);
  saveBookingsToDisk();
  return booking;
}

async function persistBookingUpdate(id, changes) {
  if (supabaseStore.enabled) {
    try {
      return await supabaseStore.updateBooking(id, changes);
    } catch (error) {
      console.warn('Supabase booking update failed; using JSON fallback:', error.message);
    }
  }
  const booking = bookingsStore.find((entry) => entry.id === id);
  if (booking) {
    Object.assign(booking, changes);
    saveBookingsToDisk();
  }
  return booking;
}

// Insert or replace a user in the in-memory store, keyed by id, so a single
// registration can never end up as two rows.
function upsertUserInMemory(user) {
  if (!user) return null;
  const idx = usersStore.findIndex((entry) => entry && entry.id === user.id);
  if (idx >= 0) usersStore[idx] = Object.assign({}, usersStore[idx], user);
  else usersStore.push(user);
  return user;
}

async function persistUser(user) {
  if (supabaseStore.enabled) {
    try {
      const saved = await supabaseStore.insertUser(user);
      upsertUserInMemory(saved);
      return saved;
    } catch (error) {
      // A genuine duplicate must reach the caller as a 409. Falling through to the
      // JSON store here would silently "succeed" and create a second account.
      if (isUniqueViolation(error)) throw error;
      console.warn('Supabase user write failed; using JSON fallback:', error.message);
    }
  }
  upsertUserInMemory(user);
  saveUsersToDisk();
  return user;
}

async function persistUserUpdate(id, changes) {
  if (supabaseStore.enabled) {
    try {
      return await supabaseStore.updateUser(id, changes);
    } catch (error) {
      console.warn('Supabase user update failed; using JSON fallback:', error.message);
    }
  }
  const user = usersStore.find((entry) => entry.id === id);
  if (user) {
    Object.assign(user, changes);
    saveUsersToDisk();
  }
  return user;
}

async function persistUserDelete(id) {
  if (supabaseStore.enabled) {
    const deleted = await supabaseStore.deleteUser(id);
    usersStore = usersStore.filter((entry) => String(entry.id) !== String(id));
    return deleted;
  }
  const index = usersStore.findIndex((entry) => String(entry.id) === String(id));
  if (index < 0) return null;
  const [deleted] = usersStore.splice(index, 1);
  if (!saveUsersToDisk()) {
    usersStore.splice(index, 0, deleted);
    throw new Error('Unable to persist the account deletion to the local account store.');
  }
  return deleted;
}

console.log(`Persistence: ${supabaseStore.enabled ? 'Supabase' : 'JSON fallback'}`);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers so the front-end can call /api/* from any origin in dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Static files
app.use(express.static(__dirname));

// Explicit images directory route
app.use('/images', express.static(path.join(__dirname, 'images')));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// The anon/publishable key is intended for browser use. Never expose the service-role key.
app.get('/api/client-config', (req, res) => {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = String(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  res.setHeader('Cache-Control', 'no-store');
  if (!url || !anonKey) {
    return res.status(503).json({
      success: false,
      error: 'Client sign-in is not configured. Set the Supabase URL and public anon/publishable key in .env.'
    });
  }

  res.json({ url, anonKey });
});

app.get('/api/demo-accounts', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const enabled = !IS_DEPLOYED_ENVIRONMENT && process.env.DEMO_LOGIN_ENABLED !== 'false';
  res.json({
    enabled,
    accounts: enabled ? DEMO_USERS.map((user) => ({
      role: user.role,
      email: user.email,
      password: user.password
    })) : []
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || 'Klassic Group Hub',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ── API: Subsidiaries ────────────────────────────────────────────────────────
app.get('/api/subsidiaries', (req, res) => {
  const subsidiaries = [
    {
      id: 1,
      name: 'Brains Infinite Innovations Inc.',
      description: 'A group of competent professionals who are dedicated to creating reliable solutions to assist you, your company, and the whole of the nation\'s economy.',
      website: 'https://brains.asia'
    },
    {
      id: 2,
      name: 'Klassic Solutions Inc.',
      description: 'A manpower services organization dedicated to providing creative solutions to companies across a wide spectrum of Philippine business.',
      website: 'http://connectorcore.com/Klassic-Solutions-PH-master/#contact'
    },
    {
      id: 3,
      name: 'Klassic Marketing Inc.',
      description: 'Formed to serve as an avenue for enterprises having global market access in importation and trading while processing transactions through Portress.',
      website: 'http://connectorcore.com/Klassic-Marketing-Inc-Website-master/'
    },
    {
      id: 4,
      name: 'Westwood Development Corp.',
      description: 'Driven by a group of individuals who are passionate about changing traditional methodologies in the construction and development industry.',
      website: 'http://connectorcore.com/Westwood-Development-Corp-Website-master/'
    },
    {
      id: 5,
      name: 'Westwood Law',
      description: 'A law firm dealing with the specialized practice of law to ensure that all cases are handled by domain experts in the field of law.',
      website: 'http://connectorcore.com/Westwood-Law-Firm-Website-master/'
    },
    {
      id: 6,
      name: 'Connector',
      description: 'A modular software system designed to integrate the main functional areas of an organization\'s business processes into a unified system.',
      website: 'http://connectorcore.com/Connector-Website-master/'
    },
    {
      id: 7,
      name: 'The Green Oasis',
      description: 'Professional landscape and design specialists dedicated to providing landscape quality services; designing attractive spaces and maintaining their functionality and beauty.',
      website: 'http://connectorcore.com/The-Green-Oasis-Website-master'
    },
    {
      id: 8,
      name: 'Luxurious Cleaning Co.',
      description: 'Introduced in the cleaning industry in September 2019. Trusted by a strong pool of clients for high-standard professional commercial and residential cleaning.',
      website: 'http://connectorcore.com/Luxurious-Cleaning-Website-master/'
    },
    {
      id: 9,
      name: 'HYT Foundation Inc.',
      description: 'A foundation for future generation leaders in which we support to enlighten and hone the youth in acquiring an adept set of business skills.',
      website: 'http://connectorcore.com/HYT-Foundation-Inc-Website-master/'
    },
    {
      id: 10,
      name: 'The Finest Fit',
      description: 'Strives to deliver high-quality uniforms that leave a great impression on our customers and establish ourselves as the best uniform company in the Philippines.',
      website: 'http://connectorcore.com/The-Finest-Fit-Website-master/'
    }
  ];

  res.json({
    success: true,
    count: subsidiaries.length,
    data: subsidiaries
  });
});

app.get('/api/payment-methods', async (req, res) => {
  try {
    if (supabaseStore.enabled) {
      return res.json({ success: true, data: await supabaseStore.listPaymentMethods() });
    }

    res.json({
      success: true,
      data: [
        { id: 1, code: 'atm_card', name: 'ATM Card', description: 'Pay by card', is_active: true },
        { id: 2, code: 'gcash', name: 'GCash', description: 'Pay with GCash', is_active: true },
        { id: 3, code: 'cash', name: 'Cash', description: 'Pay in person', is_active: true }
      ]
    });
  } catch (error) {
    console.error('Payment methods lookup failed:', error);
    res.status(500).json({ success: false, error: 'Unable to load payment methods.' });
  }
});

// ── API: Bookings ─────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * Returns all bookings to admins and only the signed-in client's bookings to clients.
 */
app.get('/api/bookings', requireBookingAccess, async (req, res) => {
  const bookings = await getBookingsStore();
  const results = req.portalActor.role === 'admin'
    ? bookings
    : bookings.filter((booking) => normalizeEmail(booking.email) === req.portalActor.email);
  res.json(results.map((booking) => ({
    ...booking,
    createdAt: booking.createdAt || booking.timestamp || 'N/A'
  })));
});

app.get('/api/notifications', requireBookingAccess, async (req, res) => {
  try {
    const notifications = await listActorNotifications(req.portalActor);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        bookingId: notification.bookingId,
        createdAt: notification.createdAt,
        readAt: notification.readAt || null
      }))
    });
  } catch (error) {
    console.error('Notification lookup failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Notification storage is unavailable. Apply the latest Supabase schema and try again.'
        : 'Unable to load notifications.'
    });
  }
});

app.patch('/api/notifications/:id/read', requireBookingAccess, async (req, res) => {
  try {
    const notifications = await listActorNotifications(req.portalActor);
    const notification = notifications.find((entry) => String(entry.id) === String(req.params.id));
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found.' });
    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      if (supabaseStore.enabled) {
        await supabaseStore.markNotificationRead(notification.id, readAt);
      } else {
        notification.readAt = readAt;
        saveNotificationsToDisk();
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Notification read update failed:', error);
    res.status(503).json({ success: false, error: 'Unable to update this notification.' });
  }
});

app.patch('/api/notifications/read-all', requireBookingAccess, async (req, res) => {
  try {
    const notifications = await listActorNotifications(req.portalActor);
    const unread = notifications.filter((notification) => !notification.readAt);
    const readAt = new Date().toISOString();
    if (supabaseStore.enabled) {
      await Promise.all(unread.map((notification) =>
        supabaseStore.markNotificationRead(notification.id, readAt)
      ));
    } else {
      unread.forEach((notification) => { notification.readAt = readAt; });
      if (unread.length) saveNotificationsToDisk();
    }
    res.json({ success: true, updated: unread.length });
  } catch (error) {
    console.error('Mark all notifications read failed:', error);
    res.status(503).json({ success: false, error: 'Unable to update notifications.' });
  }
});

/**
 * POST /api/bookings
 * Creates a new booking. Expects the booking payload in the request body.
 * Returns a confirmation payload accepted by the front-end.
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const body = req.body || {};
    let bookingClient = null;
    const bearer = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ''));
    if (bearer) {
      try {
        bookingClient = await authenticateSupabaseClient(bearer[1]);
      } catch (error) {
        console.warn('Booking submission Supabase token validation failed:', error.message);
      }
      if (!bookingClient) {
        return res.status(401).json({ success: false, error: 'Your client session is invalid. Sign in again.' });
      }
    } else {
      const localToken = getCookieValue(req, CLIENT_SESSION_COOKIE);
      const localSession = localToken && clientSessions.get(localToken);
      if (localSession && localSession.expiresAt > Date.now()) {
        bookingClient = { id: localSession.userId, email: localSession.email, name: localSession.name };
      }
    }
    const rawSubsidiaries = Array.isArray(body.subsidiaries)
      ? body.subsidiaries
      : typeof body.subsidiaries === 'string'
        ? [body.subsidiaries]
        : [];
    const rawServices = body.services && typeof body.services === 'object' ? body.services : {};
    const services = {};
    Object.keys(rawServices).forEach((company) => {
      const values = Array.isArray(rawServices[company]) ? rawServices[company] : [rawServices[company]];
      services[company] = values
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    });
    const sanitizedDate = String(body.date || body.preferredDate || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const paymentMethod = String(body.paymentMethod || '').trim();
    const bookingTime = body.createdAt || body.timestamp || new Date().toISOString();

    if (!name || !email || rawSubsidiaries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, and at least one subsidiary.'
      });
    }

    if (bookingClient && email !== bookingClient.email) {
      return res.status(403).json({ success: false, error: 'Bookings must use the email address on your signed-in account.' });
    }
    if (!['ATM Card', 'GCash', 'Cash'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Choose ATM Card, GCash, or Cash as your payment method.'
      });
    }

    const booking = {
      id: 'BK' + Date.now(),
      userId: bookingClient ? bookingClient.id : null,
      name,
      email,
      phone: String(body.phone || '').trim(),
      date: sanitizedDate,
      subsidiaries: rawSubsidiaries,
      services,
      notes: String(body.notes || '').trim(),
      paymentMethod,
      // Kept for the confirmation email. Not persisted as columns (the Supabase
      // insert whitelists its columns), so they are merged back in below.
      timeSlot: String(body.timeSlot || '').trim(),
      meetingFormat: String(body.meetingFormat || '').trim(),
      duration: String(body.duration || '').trim(),
      status: 'Pending',
      createdAt: bookingTime,
      timestamp: new Date().toISOString()
    };

    // persistBooking() already keeps bookingsStore in sync — pushing again here
    // was writing every submission twice.
    const savedBooking = await persistBooking(booking);

    // savedBooking carries the canonical id/status; booking carries the schedule
    // fields the confirmation email needs.
    queueEmail(`booking confirmation to ${savedBooking.email}`, () =>
      mailer.sendBookingConfirmation(Object.assign({}, booking, savedBooking))
    );

    let notificationWarning = '';
    try {
      await notifyAdminsOfBookingEvent({
        type: 'booking-created',
        title: 'New service booking',
        body: `${savedBooking.name} submitted booking ${savedBooking.id}.`,
        bookingId: savedBooking.id,
        eventKey: `booking:${savedBooking.id}:created`
      });
    } catch (error) {
      console.error('New booking notification could not be saved:', error);
      notificationWarning = ' The admin notification could not be saved.';
    }

    console.log(`✅ New booking saved: ${booking.id} by ${booking.name} (${booking.email})`);
    return res.status(200).json({
      success: true,
      message: 'Booking confirmed' + notificationWarning,
      notificationWarning: notificationWarning || undefined,
      data: savedBooking
    });
  } catch (error) {
    console.error('Booking submission failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error && error.message ? error.message : 'Unexpected booking submission error'
    });
  }
});

app.get('/api/bookings/:id/messages', requireBookingAccess, async (req, res) => {
  const access = await resolveAccessibleBooking(req, req.params.id);
  if (!access.booking) return res.status(access.status).json({ success: false, error: access.error });
  try {
    const messages = supabaseStore.enabled
      ? await supabaseStore.listBookingMessages(access.booking.id)
      : bookingMessagesStore.filter((message) => message.bookingId === access.booking.id);
    res.json({
      success: true,
      data: messages.map((message) => ({
        id: message.id,
        bookingId: message.booking_id || message.bookingId,
        senderId: message.sender_id || message.senderId,
        senderRole: message.sender_role || message.senderRole,
        senderName: message.sender_name || message.senderName,
        body: message.body,
        createdAt: message.created_at || message.createdAt
      }))
    });
  } catch (error) {
    console.error('Booking conversation lookup failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Booking chat storage is unavailable. Apply the latest Supabase schema and try again.'
        : 'Unable to load this booking conversation.'
    });
  }
});

app.post('/api/bookings/:id/messages', requireBookingAccess, async (req, res) => {
  const access = await resolveAccessibleBooking(req, req.params.id);
  if (!access.booking) return res.status(access.status).json({ success: false, error: access.error });
  const body = String(req.body && req.body.message || '').trim();
  if (!body || body.length > 4000) {
    return res.status(400).json({ success: false, error: 'Message is required and must be 4,000 characters or fewer.' });
  }
  const message = {
    id: crypto.randomUUID(),
    bookingId: access.booking.id,
    senderId: req.portalActor.id,
    senderRole: req.portalActor.role,
    senderName: String(req.portalActor.name || (req.portalActor.role === 'admin' ? 'KGC Admin' : 'Client')),
    body,
    createdAt: new Date().toISOString()
  };
  try {
    let saved;
    if (supabaseStore.enabled) {
      saved = await supabaseStore.insertBookingMessage(message);
      saved = {
        id: saved.id,
        bookingId: saved.booking_id,
        senderId: saved.sender_id,
        senderRole: saved.sender_role,
        senderName: saved.sender_name,
        body: saved.body,
        createdAt: saved.created_at
      };
    } else {
      bookingMessagesStore.push(message);
      fs.writeFileSync(BOOKING_MESSAGES_FILE, JSON.stringify(bookingMessagesStore, null, 2), 'utf8');
      saved = message;
    }
    let notificationWarning = '';
    const messagePreview = body.replace(/\s+/g, ' ').slice(0, 140);
    try {
      if (message.senderRole === 'admin') {
        await createBookingNotification({
          recipientRole: 'client',
          recipientId: access.booking.userId,
          recipientEmail: access.booking.email,
          type: 'booking-message',
          title: 'New reply about your booking',
          body: `${message.senderName} · Booking ${access.booking.id}: “${messagePreview}${body.length > 140 ? '…' : ''}”`,
          bookingId: access.booking.id,
          eventKey: `booking:${access.booking.id}:message:${message.id}`
        });
      } else {
        await notifyAdminsOfBookingEvent({
          type: 'booking-message',
          title: 'New booking message',
          body: `${message.senderName} · Booking ${access.booking.id}: “${messagePreview}${body.length > 140 ? '…' : ''}”`,
          bookingId: access.booking.id,
          eventKey: `booking:${access.booking.id}:message:${message.id}`
        });
      }
    } catch (error) {
      console.error('Booking message notification could not be saved:', error);
      notificationWarning = ' The message was sent, but its notification could not be saved.';
    }
    res.status(201).json({ success: true, data: saved, notificationWarning: notificationWarning || undefined });
  } catch (error) {
    console.error('Booking message save failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Booking chat storage is unavailable. Apply the latest Supabase schema and try again.'
        : 'Unable to save this message.'
    });
  }
});

/**
 * PATCH /api/bookings/:id
 * Updates the status of a booking. Body: { status: 'Approved' | 'Rejected' | 'Pending' }
 */
app.patch('/api/bookings/:id', requireAdminSession, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['Pending', 'Approved', 'Rejected'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Allowed values: ${allowed.join(', ')}`
    });
  }

  const currentBookings = await getBookingsStore();
  const booking = currentBookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
  }

  const previousStatus = booking.status;
  const updatedAt = new Date().toISOString();
  const updatedBooking = await persistBookingUpdate(id, { status, updatedAt });

  let notificationWarning = '';
  let emailWarning = '';
  if (previousStatus !== status && (status === 'Approved' || status === 'Rejected')) {
    if (mailer.isConfigured()) {
      queueEmail(`booking ${status.toLowerCase()} update to ${updatedBooking.email}`, () =>
        mailer.sendBookingStatusUpdate(updatedBooking)
      );
    } else {
      emailWarning = ' Email is not configured; the client was not emailed.';
    }
    try {
      await createBookingNotification({
        recipientRole: 'client',
        recipientId: updatedBooking.userId,
        recipientEmail: updatedBooking.email,
        type: 'booking-status',
        title: status === 'Approved' ? 'Booking approved' : 'Booking declined',
        body: `Your booking ${updatedBooking.id} is now ${status}.`,
        bookingId: updatedBooking.id,
        eventKey: `booking:${updatedBooking.id}:status:${status}:${updatedAt}`
      });
    } catch (error) {
      console.error('Booking status notification could not be saved:', error);
      notificationWarning = ' The status was updated, but its in-app notification could not be saved.';
    }
  }

  console.log(`✏️  Booking ${id} status updated to: ${status}`);
  res.json({
    success: true,
    data: updatedBooking,
    notificationWarning: notificationWarning || undefined,
    emailWarning: emailWarning || undefined
  });
});

app.get('/api/auth/admin-requests', async (req, res) => {
  const currentUsers = await getUsersStore();
  const pendingAdmins = currentUsers.filter((user) => {
    const role = normalizeRole(user.role || 'client');
    return role === 'admin' && !getApprovalStatus(user);
  }).map((user) => ({
    id: user.id,
    name: user.name,
    company: user.company || '',
    email: String(user.email || '').trim().toLowerCase(),
    phone: user.phone || '',
    status: user.status || 'Pending Approval',
    createdAt: user.createdAt || new Date().toISOString()
  }));

  res.json({
    success: true,
    data: pendingAdmins
  });
});

app.get('/api/admin/clients', requireAdminSession, async (req, res) => {
  try {
    let accounts;
    let source = 'json';
    if (supabaseStore.enabled) {
      try {
        accounts = await supabaseStore.listClientAccounts();
        source = 'supabase';
      } catch (error) {
        console.warn('Supabase client account read failed; using JSON fallback:', error.message);
        accounts = null;
        source = 'json-fallback';
      }
    }
    if (!accounts) {
      accounts = usersStore
        .filter((user) => normalizeRole(user.role) === 'client')
        .map((user) => ({
          id: user.id,
          name: user.name || '',
          company: user.company || '',
          email: user.email || '',
          phone: user.phone || '',
          isApproved: user.isApproved !== false,
          status: user.status || (user.isApproved === false ? 'Inactive' : 'Approved'),
          createdAt: user.createdAt || ''
        }));
    }

    res.json({
      success: true,
      source,
      data: accounts
    });
  } catch (error) {
    console.error('Client account directory read failed:', error);
    res.status(500).json({ success: false, error: 'Unable to load client accounts from the database.' });
  }
});

app.get('/api/admin/accounts', requireAdminSession, async (req, res) => {
  try {
    const accounts = supabaseStore.enabled
      ? await supabaseStore.listUsers()
      : usersStore;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      source: supabaseStore.enabled ? 'supabase' : 'json',
      data: accounts.map((user) => ({
        id: String(user.id),
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        role: normalizeRole(user.role),
        status: user.status || (user.isApproved === false ? 'Pending' : 'Approved'),
        isApproved: user.isApproved !== false,
        createdAt: user.createdAt || ''
      }))
    });
  } catch (error) {
    console.error('Admin account list failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Unable to load registered accounts from Supabase.'
        : 'Unable to load registered accounts.'
    });
  }
});

app.patch('/api/admin/accounts/:id', requireAdminSession, async (req, res) => {
  const accountId = String(req.params.id || '');
  const roleValue = String(req.body && req.body.role || '').trim().toLowerCase();
  const statusValue = String(req.body && req.body.status || '').trim().toLowerCase();
  const role = roleValue === 'client' ? 'client' : roleValue === 'admin' ? 'admin' : '';
  const status = statusValue === 'approved' ? 'Approved'
    : statusValue === 'pending' ? 'Pending'
      : statusValue === 'suspended' ? 'Suspended' : '';

  if (!accountId || !role || !status) {
    return res.status(400).json({
      success: false,
      error: 'Choose a valid role (Client or Admin) and status (Approved, Pending, or Suspended).'
    });
  }
  if (accountId === String(req.adminUserId)) {
    return res.status(400).json({ success: false, error: 'You cannot change your own role or account status.' });
  }

  try {
    const accounts = supabaseStore.enabled
      ? await supabaseStore.listUsers()
      : usersStore;
    const target = accounts.find((user) => String(user.id) === accountId);
    if (!target) return res.status(404).json({ success: false, error: 'Account not found.' });

    const deactivatingAdmin = normalizeRole(target.role) === 'admin' &&
      getApprovalStatus(target) && (role !== 'admin' || status !== 'Approved');
    if (deactivatingAdmin) {
      const activeAdmins = accounts.filter((user) =>
        normalizeRole(user.role) === 'admin' && getApprovalStatus(user)
      );
      if (activeAdmins.length <= 1) {
        return res.status(409).json({
          success: false,
          error: 'The last approved admin account cannot be demoted or suspended.'
        });
      }
    }

    const changes = {
      role,
      status,
      isApproved: status === 'Approved'
    };
    const saved = supabaseStore.enabled
      ? await supabaseStore.updateUser(accountId, changes)
      : await persistUserUpdate(accountId, changes);
    if (!saved) return res.status(404).json({ success: false, error: 'Account not found.' });

    res.json({
      success: true,
      data: {
        id: String(saved.id),
        name: saved.name || '',
        email: saved.email || '',
        role: normalizeRole(saved.role),
        status: saved.status || status,
        isApproved: saved.isApproved !== false
      }
    });
  } catch (error) {
    console.error('Admin account update failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Unable to update this account in Supabase.'
        : 'Unable to update this account.'
    });
  }
});

app.delete('/api/admin/accounts/:id', requireAdminSession, async (req, res) => {
  const accountId = String(req.params.id || '');
  if (!accountId) return res.status(400).json({ success: false, error: 'A valid account ID is required.' });
  if (accountId === String(req.adminUserId)) {
    return res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
  }

  try {
    const accounts = supabaseStore.enabled
      ? await supabaseStore.listUsers()
      : usersStore;
    const target = accounts.find((user) => String(user.id) === accountId);
    if (!target) return res.status(404).json({ success: false, error: 'Account not found.' });

    if (normalizeRole(target.role) === 'admin' && getApprovalStatus(target)) {
      const activeAdmins = accounts.filter((user) =>
        normalizeRole(user.role) === 'admin' && getApprovalStatus(user)
      );
      if (activeAdmins.length <= 1) {
        return res.status(409).json({
          success: false,
          error: 'The last approved admin account cannot be deleted.'
        });
      }
    }

    const deleted = await persistUserDelete(accountId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Account not found.' });
    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Admin account deletion failed:', error);
    res.status(503).json({
      success: false,
      error: supabaseStore.enabled
        ? 'Unable to delete this account from Supabase. No local fallback was applied.'
        : 'Unable to delete this account from the local account store.'
    });
  }
});

app.get('/api/admin/campaigns/recipients', requireAdminSession, async (req, res) => {
  try {
    const data = await getCampaignRecipientData();
    res.json({
      success: true,
      data: {
        clients: data.recipients,
        subsidiaries: data.subsidiaries
      }
    });
  } catch (error) {
    console.error('Campaign recipient list failed:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to load current client recipients.'
    });
  }
});

app.get('/api/admin/campaigns/status', requireAdminSession, async (req, res) => {
  const configured = mailer.isConfigured();
  const verification = configured
    ? await mailer.verifyConnection()
    : { ok: false, reason: 'Email delivery is not configured.' };
  res.json({
    success: true,
    data: {
      configured,
      ready: verification.ok,
      error: verification.ok ? '' : verification.reason
    }
  });
});

app.post('/api/admin/campaigns', requireAdminSession, async (req, res) => {
  const subject = String((req.body && req.body.subject) || '').trim();
  const message = String((req.body && req.body.message) || '').trim();
  if (!subject || subject.length > 150 || /[\r\n]/.test(subject)) {
    return res.status(400).json({
      success: false,
      error: 'Subject is required, must be 150 characters or fewer, and cannot contain line breaks.'
    });
  }
  if (!message || message.length > 10000) {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be 10,000 characters or fewer.'
    });
  }
  if (!mailer.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Email delivery is not configured. Set EMAIL_USER and EMAIL_PASS in the server environment.'
    });
  }
  const emailVerification = await mailer.verifyConnection();
  if (!emailVerification.ok) {
    console.error('Campaign email configuration check failed:', emailVerification.reason);
    return res.status(503).json({
      success: false,
      error: 'Gmail SMTP could not connect. Check EMAIL_USER and EMAIL_PASS, then restart the server.'
    });
  }

  const selection = req.body && req.body.recipientSelection;
  const selectionType = String(selection && selection.type || 'all').trim().toLowerCase();
  if (!['all', 'subsidiary', 'custom'].includes(selectionType)) {
    return res.status(400).json({
      success: false,
      error: 'Recipient selection must be all, subsidiary, or custom.'
    });
  }

  let recipientData;
  try {
    recipientData = await getCampaignRecipientData();
  } catch (error) {
    console.error('Campaign recipient resolution failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to resolve selected client recipients.'
    });
  }
  let recipients = recipientData.recipients;
  if (selectionType === 'subsidiary') {
    const subsidiary = String(selection.subsidiary || '').trim();
    if (!recipientData.subsidiaries.some((name) => name.toLowerCase() === subsidiary.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Select a valid KGC subsidiary.'
      });
    }
    recipients = recipients.filter((recipient) =>
      recipient.subsidiaries.some((name) => name.toLowerCase() === subsidiary.toLowerCase())
    );
  } else if (selectionType === 'custom') {
    const clientIds = Array.isArray(selection.clientIds)
      ? Array.from(new Set(selection.clientIds.map((id) => String(id || '').trim()).filter(Boolean)))
      : [];
    if (!clientIds.length || clientIds.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Choose between 1 and 500 active client accounts.'
      });
    }
    const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
    if (clientIds.some((id) => !recipientsById.has(id))) {
      return res.status(400).json({
        success: false,
        error: 'One or more selected clients are no longer active. Refresh the recipient list and try again.'
      });
    }
    recipients = clientIds.map((id) => recipientsById.get(id));
  }

  const MAX_CAMPAIGN_RECIPIENTS = 500;
  if (!recipients.length) {
    return res.status(400).json({ success: false, error: 'There are no active client accounts with valid email addresses.' });
  }
  if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
    return res.status(413).json({
      success: false,
      error: `This campaign has ${recipients.length} recipients, exceeding the ${MAX_CAMPAIGN_RECIPIENTS}-recipient limit.`
    });
  }

  let sent = 0;
  let failed = 0;
  let deliveryError = '';
  for (const recipient of recipients) {
    try {
      await mailer.sendCampaignEmail(recipient, subject, message);
      sent += 1;
    } catch (error) {
      console.error('Campaign SMTP delivery error:', error.response || error.message || error);
      console.error(`Campaign delivery failed for recipient ${recipient.email}.`);
      if (!deliveryError) deliveryError = error.message || 'One or more campaign emails could not be sent.';
      failed += 1;
    }
  }

  const success = failed === 0;
  res.status(success ? 200 : 207).json({
    success,
    data: { sent, failed, total: recipients.length },
    ...(deliveryError ? { error: deliveryError } : {}),
    message: success
      ? `Campaign sent to ${sent} client account(s).`
      : `Campaign delivery completed with ${sent} sent and ${failed} failed.`
  });
});

app.post('/api/auth/logout', (req, res) => {
  const clientToken = getCookieValue(req, CLIENT_SESSION_COOKIE);
  if (clientToken) clientSessions.delete(clientToken);
  setAdminSessionCookie(res, '', 0);
  setClientSessionCookie(res, '', 0);
  res.json({ success: true });
});

app.get('/api/auth/session', requireAdminSession, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      id: String(req.adminUser.id),
      name: req.adminUser.name || 'Admin',
      email: normalizeEmail(req.adminUser.email),
      role: 'admin'
    }
  });
});

app.post('/api/auth/register/request-code', async (req, res) => {
  const name = String(req.body && req.body.name || '').trim();
  const email = normalizeEmail(req.body && req.body.email);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Enter your name and a valid email address.' });
  }
  const previousSentAt = registrationSendTimes.get(email);
  if (previousSentAt && Date.now() - previousSentAt < REGISTRATION_CODE_RESEND_MS) {
    return res.status(429).json({ success: false, error: 'Wait a minute before requesting another verification code.' });
  }
  try {
    const matches = await getUsersByEmail(email);
    if (matches.concat(DEMO_USERS).some((user) => normalizeEmail(user.email) === email)) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in instead.' });
    }
    if (!mailer.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Email verification is unavailable. Configure EMAIL_USER and EMAIL_PASS.' });
    }
    registrationSendTimes.set(email, Date.now());
    const code = String(crypto.randomInt(100000, 1000000));
    const challenge = {
      codeHash: crypto.createHash('sha256').update(email + ':' + code).digest('hex'),
      name,
      company: String(req.body.company || '').trim(),
      phone: String(req.body.phone || '').trim(),
      expiresAt: Date.now() + REGISTRATION_CODE_TTL_MS,
      sentAt: Date.now(),
      attempts: 0
    };
    await mailer.sendRegistrationVerificationCode(email, name, code);
    registrationChallenges.set(email, challenge);
    return res.json({ success: true, message: 'A verification code has been sent to your email address.' });
  } catch (error) {
    console.error('Registration verification code send failed:', error);
    return res.status(503).json({ success: false, error: 'Unable to send a verification code. Check SMTP configuration and try again.' });
  }
});

app.post('/api/auth/register/verify', async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const code = String(req.body && req.body.code || '').trim();
  const password = String(req.body && req.body.password || '');
  if (!email || !/^\d{6}$/.test(code) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, error: 'Enter the six-digit code and a password of 8 to 128 characters.' });
  }
  const challenge = registrationChallenges.get(email);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    registrationChallenges.delete(email);
    return res.status(400).json({ success: false, error: 'The verification code expired. Request a new code.' });
  }
  if (challenge.attempts >= REGISTRATION_CODE_MAX_ATTEMPTS) {
    registrationChallenges.delete(email);
    return res.status(429).json({ success: false, error: 'Too many incorrect codes. Request a new verification code.' });
  }
  const submittedHash = crypto.createHash('sha256').update(email + ':' + code).digest();
  const expectedHash = Buffer.from(challenge.codeHash, 'hex');
  if (!crypto.timingSafeEqual(submittedHash, expectedHash)) {
    challenge.attempts += 1;
    return res.status(400).json({ success: false, error: 'That verification code is incorrect.' });
  }

  try {
    const existing = (await getUsersByEmail(email)).concat(DEMO_USERS)
      .some((user) => normalizeEmail(user.email) === email);
    if (existing) {
      registrationChallenges.delete(email);
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in instead.' });
    }

    let user;
    let provider;
    if (supabaseStore.enabled) {
      user = await supabaseStore.createVerifiedClient({
        email,
        password,
        name: challenge.name,
        company: challenge.company,
        phone: challenge.phone
      });
      provider = 'supabase';
    } else {
      user = await persistUser({
        id: 'USR' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase(),
        role: 'client',
        name: challenge.name,
        company: challenge.company,
        email,
        phone: challenge.phone,
        password: await hashPassword(password),
        isApproved: true,
        status: 'Approved',
        createdAt: new Date().toISOString()
      });
      const token = crypto.randomBytes(32).toString('hex');
      clientSessions.set(token, {
        userId: String(user.id),
        email,
        name: user.name,
        expiresAt: Date.now() + CLIENT_SESSION_TTL_MS
      });
      setClientSessionCookie(res, token, Math.floor(CLIENT_SESSION_TTL_MS / 1000));
      provider = 'local';
    }
    registrationChallenges.delete(email);
    queueEmail(`welcome to ${email}`, () => mailer.sendWelcomeEmail(user));
    return res.status(201).json({
      success: true,
      provider,
      message: 'Email verified and account created.',
      data: {
        id: user.id,
        role: 'client',
        name: user.name,
        email,
        isApproved: true,
        status: 'Approved'
      }
    });
  } catch (error) {
    if (isUniqueViolation(error) || /already registered|already exists/i.test(String(error.message || ''))) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in instead.' });
    }
    console.error('Verified client registration failed:', error);
    return res.status(500).json({ success: false, error: 'Could not create your account. Please try again.' });
  }
});

// Sync a Supabase Auth client into the public.users directory by email.
app.post('/api/users/sync', requireBookingAccess, async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (req.portalActor.role !== 'client' || email !== req.portalActor.email) {
    return res.status(403).json({ success: false, error: 'You may only sync your own verified client profile.' });
  }
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  try {
    if (supabaseStore.enabled) {
      const { user: result, created } = await supabaseStore.upsertClient({
        id: body.id || null,
        email: email,
        name: String(body.name || '').trim(),
        company: String(body.company || '').trim(),
        phone: String(body.phone || '').trim(),
        role: 'client',
        password: '',
        isApproved: true,
        status: 'Approved',
        createdAt: new Date().toISOString()
      });
      // Only welcome a genuinely new account. This endpoint doubles as a profile
      // sync, so an unconditional send re-welcomed the client on every login.
      if (created) {
        queueEmail(`welcome to ${result.email}`, () => mailer.sendWelcomeEmail(result));
      }
      return res.json({ success: true, data: result });
    }

    // JSON fallback
    // Compare through normalizeEmail() so a stored "user@x.com " (stray space)
    // cannot create a second row for the same address.
    const existingIdx = usersStore.findIndex((u) => normalizeEmail(u.email) === email);
    const userRow = {
      id: body.id || 'USR' + Date.now(),
      role: 'client',
      name: String(body.name || '').trim(),
      company: String(body.company || '').trim(),
      email: email,
      phone: String(body.phone || '').trim(),
      password: '',
      isApproved: true,
      status: 'Approved',
      createdAt: new Date().toISOString()
    };
    const isNewAccount = existingIdx < 0;
    if (isNewAccount) {
      usersStore.push(userRow);
    } else {
      Object.assign(usersStore[existingIdx], userRow, { id: usersStore[existingIdx].id });
    }
    saveUsersToDisk();
    if (isNewAccount) {
      queueEmail(`welcome to ${userRow.email}`, () => mailer.sendWelcomeEmail(userRow));
    }
    res.json({ success: true, data: userRow });
  } catch (error) {
    console.error('User sync failed:', error);
    res.status(500).json({ success: false, error: 'Unable to sync user profile.' });
  }
});

app.patch('/api/auth/admin-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};

  if (!['approve', 'reject'].includes(String(action || '').toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Action must be either approve or reject.'
    });
  }

  const currentUsers = await getUsersStore();
  const targetUser = currentUsers.find((user) => user.id === id);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'Admin request not found.'
    });
  }

  if (normalizeRole(targetUser.role || 'client') !== 'admin') {
    return res.status(400).json({
      success: false,
      error: 'The selected account is not an admin request.'
    });
  }

  const approved = String(action).toLowerCase() === 'approve';
  targetUser.isApproved = approved;
  targetUser.status = approved ? 'Approved' : 'Rejected';
  const updatedUser = await persistUserUpdate(id, {
    isApproved: targetUser.isApproved,
    status: targetUser.status
  });

  console.log(`🛡️ Admin approval update: ${targetUser.email} -> ${targetUser.status}`);

  res.json({
    success: true,
    data: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
      status: updatedUser.status
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, company, email, phone, password, role = 'client' } = req.body || {};

  // Normalise ONCE and use only this value from here on.
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(name || '').trim();

  if (!trimmedName || !normalizedEmail || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required.'
    });
  }

  // A malformed address would otherwise be stored and later match nothing, or
  // collide with another blank row. Reject it up front.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.'
    });
  }

  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'client') {
    return res.status(400).json({
      success: false,
      error: 'Client registration requires email verification. Request a code to continue.'
    });
  }

  try {
    // Compare against a de-duplicated snapshot so duplicate rows written by older
    // versions cannot influence the result.
    const currentUsers = dedupeUsers(await getUsersStore());
    const existing = findAccountByEmail(normalizedEmail, currentUsers);

    if (existing) {
      // Log exactly which row matched: this is what makes a phantom record obvious.
      console.warn(
        `⛔ Duplicate email blocked: ${normalizedEmail} matched id=${existing.id} ` +
        `role=${existing.role} status=${existing.status || 'n/a'}`
      );
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const isAdminRequest = normalizedRole === 'admin';
    const newUser = {
      // Random suffix so two sign-ups in the same millisecond cannot collide.
      id: 'USR' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase(),
      role: normalizedRole,
      name: trimmedName,
      company: String(company || '').trim(),
      email: normalizedEmail,
      phone: String(phone || '').trim(),
      password: await hashPassword(password),
      isApproved: !isAdminRequest,
      status: isAdminRequest ? 'Pending Approval' : 'Approved',
      createdAt: new Date().toISOString()
    };

    // persistUser() already keeps usersStore in sync — pushing again here is what
    // wrote every registration to disk twice.
    const savedUser = await persistUser(newUser);

    queueEmail(`welcome to ${savedUser.email}`, () => mailer.sendWelcomeEmail(savedUser));

    console.log(`✅ New user registered: ${newUser.email} (${newUser.role}) -> ${newUser.status}`);

    const publicUser = {
      id: savedUser.id,
      role: savedUser.role,
      name: savedUser.name,
      company: savedUser.company,
      email: savedUser.email,
      phone: savedUser.phone,
      isApproved: savedUser.isApproved,
      status: savedUser.status
    };

    if (isAdminRequest) {
      return res.status(201).json({
        success: true,
        requiresApproval: true,
        message: 'Admin account request submitted! Your account requires authorization from an existing Admin before you can log in.',
        data: publicUser
      });
    }

    return res.status(201).json({
      success: true,
      requiresApproval: false,
      data: publicUser
    });
  } catch (error) {
    // The database's unique constraint is the final arbiter when two requests race
    // past the check above. Postgres reports that as 23505.
    if (isUniqueViolation(error)) {
      console.warn(`⛔ Duplicate email rejected by the database: ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }
    console.error('Registration failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Could not create your account. Please try again.'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role = 'client' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  try {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'admin' && IS_DEPLOYED_ENVIRONMENT && !supabaseStore.enabled) {
      return res.status(503).json({
        success: false,
        error: 'Admin sign-in is not configured. Set the Supabase URL and service-role key.'
      });
    }

    // Avoid downloading every user row on the login critical path.
    const matchingUsers = await getUsersByEmail(email);
    let user = await findUserByCredentials(email, password, normalizedRole, matchingUsers);
    let authenticatedIdentity = null;

    if (!user && normalizedRole === 'admin' && supabaseStore.enabled &&
        typeof supabaseStore.authenticateWithPassword === 'function') {
      try {
        authenticatedIdentity = await supabaseStore.authenticateWithPassword(email, password);
        if (authenticatedIdentity) {
          user = matchingUsers.find((entry) =>
            String(entry.id) === String(authenticatedIdentity.id) &&
            normalizeRole(entry.role) === 'admin'
          ) || null;
        }
      } catch (error) {
        if (!isSupabaseCredentialRejection(error)) throw error;
        console.warn('Supabase rejected the admin credentials.');
      }
    }

    if (!user) {
      let pendingAdmin = null;
      for (const entry of matchingUsers) {
        const matchesEmail = normalizeEmail(entry.email) === normalizeEmail(email);
        if (matchesEmail && normalizeRole(entry.role || 'client') === 'admin' &&
            !getApprovalStatus(entry) && await verifyPassword(password, entry.password)) {
          pendingAdmin = entry;
          break;
        }
      }

      if (pendingAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Your Admin account is pending approval from an authorized Admin.'
        });
      }

      if (authenticatedIdentity) {
        return res.status(403).json({
          success: false,
          error: 'This Supabase account is not linked to an admin profile in public.users.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.'
      });
    }

    if (normalizedRole === 'client' && !isActiveClient(user)) {
      return res.status(403).json({
        success: false,
        error: 'This client account is pending approval or suspended. Contact an administrator for assistance.'
      });
    }

    if (normalizedRole === 'admin' && !getApprovalStatus(user)) {
      return res.status(403).json({
        success: false,
        error: 'Your Admin account is pending approval from an authorized Admin.'
      });
    }

    if (normalizedRole === 'admin') {
      let token;
      try {
        token = createAdminSessionToken(user.id);
      } catch (error) {
        console.error('Admin session could not be created:', error);
        return res.status(503).json({
          success: false,
          error: 'Admin sign-in is not configured on this deployment.'
        });
      }
      setAdminSessionCookie(res, token, Math.floor(ADMIN_SESSION_TTL_MS / 1000));
    } else {
      const token = crypto.randomBytes(32).toString('hex');
      clientSessions.set(token, {
        userId: String(user.id),
        email: normalizeEmail(user.email),
        name: user.name || 'Client',
        expiresAt: Date.now() + CLIENT_SESSION_TTL_MS
      });
      setClientSessionCookie(res, token, Math.floor(CLIENT_SESSION_TTL_MS / 1000));
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: String(user.email).trim().toLowerCase(),
        role: String(user.role || 'client').trim().toLowerCase(),
        isApproved: user.isApproved !== false,
        status: user.status || 'Approved'
      }
    });
  } catch (error) {
    console.error('Sign-in request failed:', error);
    return res.status(503).json({
      success: false,
      error: 'The sign-in service is temporarily unavailable. Please try again later.'
    });
  }
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ── Start server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n🚀 Klassic Group Corporate Hub Server');
    console.log('=====================================');
    console.log(`📍 Server running at: http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💼 App: ${process.env.APP_NAME || 'Klassic Group Hub'}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🔌 Subsidiaries API: http://${HOST}:${PORT}/api/subsidiaries`);
    console.log(`📅 Bookings API:     http://${HOST}:${PORT}/api/bookings`);
    console.log(`✉️  Email: ${mailer.isConfigured()
      ? 'Gmail SMTP configured (welcome, booking confirmations, and campaigns enabled)'
      : 'NOT configured — set EMAIL_USER / EMAIL_PASS in .env to enable email delivery'}`);
    console.log('=====================================\n');

  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
  });
}

module.exports = app;
