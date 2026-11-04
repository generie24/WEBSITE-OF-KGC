const express = require('express');
const path = require('path');
const fs = require('fs');
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

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Durable JSON-backed persistence under data/ with fallback to legacy root files
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEGACY_BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const LEGACY_USERS_FILE = path.join(__dirname, 'users.json');

const DEMO_USERS = [
  { id: 'demo-client', role: 'client', name: 'Client User', email: 'client@kgc.ph', password: 'password', isApproved: true, status: 'Approved' },
  { id: 'demo-admin', role: 'admin', name: 'Admin User', email: 'admin@kgc.ph', password: 'password', isApproved: true, status: 'Approved' }
];

// ── In-memory bookings store (seeded from disk on startup) ──────────────────
let bookingsStore = [];
let usersStore = [];

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
  } catch (err) {
    console.warn('⚠️  Could not save users.json:', err.message);
  }
}

function normalizeRole(value) {
  return String(value || 'client').trim().toLowerCase() === 'admin' ? 'admin' : 'client';
}

function getApprovalStatus(user) {
  if (!user) return false;
  if (String(user.role || 'client').trim().toLowerCase() !== 'admin') return true;
  return user.isApproved === true || user.status === 'Approved' || user.status === 'Active';
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

function findUserByCredentials(email, password, role = 'client', users = usersStore) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const normalizedRole = normalizeRole(role);

  const registeredUser = users.find((u) => {
    return String(u.email || '').trim().toLowerCase() === normalizedEmail &&
      String(u.password || '') === normalizedPassword &&
      normalizeRole(u.role || 'client') === normalizedRole;
  });

  if (registeredUser) return registeredUser;

  return DEMO_USERS.find((u) => {
    return u.email.toLowerCase() === normalizedEmail &&
      u.password === normalizedPassword &&
      normalizeRole(u.role || 'client') === normalizedRole;
  }) || null;
}

async function getUsersByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (supabaseStore.enabled) {
    try {
      return await supabaseStore.findUsersByEmail(normalizedEmail);
    } catch (error) {
      console.warn('Supabase user lookup failed; using JSON fallback:', error.message);
    }
  }
  return usersStore.filter((user) =>
    String(user.email || '').trim().toLowerCase() === normalizedEmail
  );
}

loadBookingsFromDisk();
loadUsersFromDisk();

const supabaseStore = createSupabaseStore();

function queueEmail(label, send) {
  // Keep SMTP/network work off the HTTP response path and handle every failure.
  setImmediate(() => {
    Promise.resolve()
      .then(send)
      .then(() => console.log(`✉️  ${label} email sent`))
      .catch((error) => console.warn(`Email delivery failed (${label}):`, error.message));
  });
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

console.log(`Persistence: ${supabaseStore.enabled ? 'Supabase' : 'JSON fallback'}`);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers so the front-end can call /api/* from any origin in dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
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
        { id: 1, code: 'ewallet', name: 'GCash / Maya', description: 'E-Wallet', is_active: true },
        { id: 2, code: 'card', name: 'Credit / Debit Card', description: 'Visa / Mastercard', is_active: true },
        { id: 3, code: 'bank_transfer', name: 'Bank Transfer / Direct Deposit', description: 'BDO / BPI / Direct Deposit', is_active: true },
        { id: 4, code: 'invoice', name: 'Cash on Delivery / Corporate Invoice', description: 'COD / Corporate Billing', is_active: true }
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
 * Returns all bookings. Pass ?email=x to filter to a specific client's bookings.
 */
app.get('/api/bookings', async (req, res) => {
  const { email } = req.query;
  let results = await getBookingsStore();
  if (email) {
    results = bookingsStore.filter(b => b.email === String(email).trim().toLowerCase());
  }

  const normalizedResults = results.map((booking) => ({
    ...booking,
    createdAt: booking.createdAt || booking.timestamp || 'N/A'
  }));

  res.json(normalizedResults);
});

/**
 * POST /api/bookings
 * Creates a new booking. Expects the booking payload in the request body.
 * Returns a confirmation payload accepted by the front-end.
 */
app.post('/api/bookings', async (req, res) => {
  try {
    const body = req.body || {};
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

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please select a payment method to proceed.'
      });
    }

    const booking = {
      id: 'BK' + Date.now(),
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

    console.log(`✅ New booking saved: ${booking.id} by ${booking.name} (${booking.email})`);
    return res.status(200).json({
      success: true,
      message: 'Booking confirmed',
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

/**
 * PATCH /api/bookings/:id
 * Updates the status of a booking. Body: { status: 'Approved' | 'Rejected' | 'Pending' }
 */
app.patch('/api/bookings/:id', async (req, res) => {
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

  const updatedAt = new Date().toISOString();
  const updatedBooking = await persistBookingUpdate(id, { status, updatedAt });

  console.log(`✏️  Booking ${id} status updated to: ${status}`);
  res.json({ success: true, data: updatedBooking });
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

// Sync a Supabase Auth client into the public.users directory by email.
app.post('/api/users/sync', async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
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
      password: String(password),
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

  const normalizedRole = normalizeRole(role);
  // Avoid downloading every user row on the login critical path.
  const matchingUsers = await getUsersByEmail(email);
  const user = findUserByCredentials(email, password, normalizedRole, matchingUsers);

  if (!user) {
    const pendingAdmin = matchingUsers.find((entry) => {
      const matchesEmail = String(entry.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase();
      const matchesPassword = String(entry.password || '') === String(password || '');
      return matchesEmail && matchesPassword && normalizeRole(entry.role || 'client') === 'admin' && !getApprovalStatus(entry);
    });

    if (pendingAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Your Admin account is pending approval from an authorized Admin.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials.'
    });
  }

  if (normalizedRole === 'admin' && !getApprovalStatus(user)) {
    return res.status(403).json({
      success: false,
      error: 'Your Admin account is pending approval from an authorized Admin.'
    });
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
      ? 'SMTP configured (welcome + booking confirmations enabled)'
      : 'NOT configured — set SMTP_HOST / SMTP_PORT / SMTP_FROM in .env to enable emails'}`);
    console.log('=====================================\n');

    // Probe the SMTP host once, off the request path. Never fatal.
    if (mailer.isConfigured()) {
      mailer.verifyConnection().then((result) => {
        console.log(result.ok
          ? '✉️  SMTP connection verified.'
          : `⚠️  SMTP connection failed: ${result.reason}`);
      });
    }
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
