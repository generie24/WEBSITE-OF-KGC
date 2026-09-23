const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
try {
  if (fs.existsSync('.env')) {
    const dotenv = require('dotenv');
    dotenv.config();
  }
} catch (err) {
  console.log('dotenv not found, using default values');
}

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
      usersStore = JSON.parse(raw) || [];
      if (sourceFile === LEGACY_USERS_FILE && !fs.existsSync(USERS_FILE)) {
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

function findUserByCredentials(email, password, role = 'client') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const normalizedRole = normalizeRole(role);

  const registeredUser = usersStore.find((u) => {
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

loadBookingsFromDisk();
loadUsersFromDisk();

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

// ── API: Bookings ─────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * Returns all bookings. Pass ?email=x to filter to a specific client's bookings.
 */
app.get('/api/bookings', (req, res) => {
  const { email } = req.query;
  let results = bookingsStore;
  if (email) {
    results = bookingsStore.filter(b => b.email === String(email).trim().toLowerCase());
  }
  res.json(results);
});

/**
 * POST /api/bookings
 * Creates a new booking. Expects the booking payload in the request body.
 * Returns a confirmation payload accepted by the front-end.
 */
app.post('/api/bookings', (req, res) => {
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
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    bookingsStore.push(booking);
    saveBookingsToDisk();

    console.log(`✅ New booking saved: ${booking.id} by ${booking.name} (${booking.email})`);
    return res.status(200).json({
      success: true,
      message: 'Booking confirmed',
      data: booking
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
app.patch('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['Pending', 'Approved', 'Rejected'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Allowed values: ${allowed.join(', ')}`
    });
  }

  const booking = bookingsStore.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();
  saveBookingsToDisk();

  console.log(`✏️  Booking ${id} status updated to: ${status}`);
  res.json({ success: true, data: booking });
});

app.get('/api/auth/admin-requests', (req, res) => {
  const pendingAdmins = usersStore.filter((user) => {
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

app.patch('/api/auth/admin-requests/:id', (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};

  if (!['approve', 'reject'].includes(String(action || '').toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Action must be either approve or reject.'
    });
  }

  const targetUser = usersStore.find((user) => user.id === id);
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
  saveUsersToDisk();

  console.log(`🛡️ Admin approval update: ${targetUser.email} -> ${targetUser.status}`);

  res.json({
    success: true,
    data: {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      isApproved: targetUser.isApproved,
      status: targetUser.status
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, company, email, phone, password, role = 'client' } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required.'
    });
  }

  const normalizedRole = normalizeRole(role);
  const normalizedEmail = String(email).trim().toLowerCase();
  const userExists = usersStore.some((u) => String(u.email || '').trim().toLowerCase() === normalizedEmail);
  if (userExists) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email already exists.'
    });
  }

  const isAdminRequest = normalizedRole === 'admin';
  const newUser = {
    id: 'USR' + Date.now(),
    role: normalizedRole,
    name: String(name).trim(),
    company: String(company || '').trim(),
    email: normalizedEmail,
    phone: String(phone || '').trim(),
    password: String(password),
    isApproved: !isAdminRequest,
    status: isAdminRequest ? 'Pending Approval' : 'Approved',
    createdAt: new Date().toISOString()
  };

  usersStore.push(newUser);
  saveUsersToDisk();

  console.log(`✅ New user registered: ${newUser.email} (${newUser.role}) -> ${newUser.status}`);

  if (isAdminRequest) {
    return res.status(201).json({
      success: true,
      requiresApproval: true,
      message: 'Admin account request submitted! Your account requires authorization from an existing Admin before you can log in.',
      data: {
        id: newUser.id,
        role: newUser.role,
        name: newUser.name,
        company: newUser.company,
        email: newUser.email,
        phone: newUser.phone,
        isApproved: newUser.isApproved,
        status: newUser.status
      }
    });
  }

  res.status(201).json({
    success: true,
    requiresApproval: false,
    data: {
      id: newUser.id,
      role: newUser.role,
      name: newUser.name,
      company: newUser.company,
      email: newUser.email,
      phone: newUser.phone,
      isApproved: newUser.isApproved,
      status: newUser.status
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role = 'client' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.'
    });
  }

  const normalizedRole = normalizeRole(role);
  const user = findUserByCredentials(email, password, normalizedRole);

  if (!user) {
    const pendingAdmin = usersStore.find((entry) => {
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
