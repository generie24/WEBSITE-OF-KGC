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

// Path for persistent bookings storage
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const USERS_FILE = path.join(__dirname, 'users.json');

const DEMO_USERS = [
  { id: 'demo-client', role: 'client', name: 'Client User', email: 'client@kgc.ph', password: 'password' },
  { id: 'demo-admin', role: 'admin', name: 'Admin User', email: 'admin@kgc.ph', password: 'password' }
];

// ── In-memory bookings store (seeded from disk on startup) ──────────────────
let bookingsStore = [];
let usersStore = [];

function loadBookingsFromDisk() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      bookingsStore = JSON.parse(raw) || [];
      console.log(`📂 Loaded ${bookingsStore.length} booking(s) from bookings.json`);
    }
  } catch (err) {
    console.warn('⚠️  Could not read bookings.json, starting fresh:', err.message);
    bookingsStore = [];
  }
}

function saveBookingsToDisk() {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookingsStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  Could not save bookings.json:', err.message);
  }
}

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      usersStore = JSON.parse(raw) || [];
      console.log(`👤 Loaded ${usersStore.length} registered user(s) from users.json`);
    }
  } catch (err) {
    console.warn('⚠️  Could not read users.json, starting fresh:', err.message);
    usersStore = [];
  }
}

function saveUsersToDisk() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  Could not save users.json:', err.message);
  }
}

function findUserByCredentials(email, password, role = 'client') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const normalizedRole = String(role || 'client').trim().toLowerCase();

  const registeredUser = usersStore.find((u) => {
    return String(u.email || '').trim().toLowerCase() === normalizedEmail &&
      String(u.password || '') === normalizedPassword &&
      String(u.role || 'client').trim().toLowerCase() === normalizedRole;
  });

  if (registeredUser) return registeredUser;

  return DEMO_USERS.find((u) => {
    return u.email.toLowerCase() === normalizedEmail &&
      u.password === normalizedPassword &&
      u.role === normalizedRole;
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
    const sanitizedDate = String(body.date || body.preferredDate || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!name || !email || rawSubsidiaries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, and at least one subsidiary.'
      });
    }

    const booking = {
      id: 'BK' + Date.now(),
      name,
      email,
      phone: String(body.phone || '').trim(),
      date: sanitizedDate,
      subsidiaries: rawSubsidiaries,
      notes: String(body.notes || '').trim(),
      hytDonation: Boolean(body.hytDonation),
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

app.post('/api/auth/register', (req, res) => {
  const { name, company, email, phone, password, role = 'client' } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required.'
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const userExists = usersStore.some((u) => String(u.email || '').trim().toLowerCase() === normalizedEmail);
  if (userExists) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email already exists.'
    });
  }

  const newUser = {
    id: 'USR' + Date.now(),
    role: String(role || 'client').trim().toLowerCase() === 'admin' ? 'admin' : 'client',
    name: String(name).trim(),
    company: String(company || '').trim(),
    email: normalizedEmail,
    phone: String(phone || '').trim(),
    password: String(password),
    createdAt: new Date().toISOString()
  };

  usersStore.push(newUser);
  saveUsersToDisk();

  console.log(`✅ New user registered: ${newUser.email} (${newUser.role})`);
  res.status(201).json({
    success: true,
    data: {
      id: newUser.id,
      role: newUser.role,
      name: newUser.name,
      company: newUser.company,
      email: newUser.email,
      phone: newUser.phone
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

  const user = findUserByCredentials(email, password, role);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials.'
    });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: String(user.email).trim().toLowerCase(),
      role: String(user.role || 'client').trim().toLowerCase()
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
