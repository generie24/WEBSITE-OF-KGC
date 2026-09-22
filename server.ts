import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const USERS_FILE = path.join(__dirname, 'users.json');

const DEMO_USERS = [
  { id: 'demo-client', role: 'client', name: 'Client User', email: 'client@kgc.ph', password: 'password' },
  { id: 'demo-admin', role: 'admin', name: 'Admin User', email: 'admin@kgc.ph', password: 'password' }
];

let bookingsStore: any[] = [];
let usersStore: any[] = [];

function loadBookingsFromDisk() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      bookingsStore = JSON.parse(raw) || [];
      console.log(`📂 Loaded ${bookingsStore.length} booking(s) from bookings.json`);
    }
  } catch (err) {
    console.warn('⚠️  Could not read bookings.json, starting fresh:', (err as Error).message);
    bookingsStore = [];
  }
}

function saveBookingsToDisk() {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookingsStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  Could not save bookings.json:', (err as Error).message);
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
    console.warn('⚠️  Could not read users.json, starting fresh:', (err as Error).message);
    usersStore = [];
  }
}

function saveUsersToDisk() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️  Could not save users.json:', (err as Error).message);
  }
}

function findUserByCredentials(email: string, password: string, role = 'client') {
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Static files - serve the current directory
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Custom logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || 'Klassic Group Hub',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API endpoint - subsidiaries data
app.get('/api/subsidiaries', (req: Request, res: Response) => {
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

app.get('/api/bookings', (req: Request, res: Response) => {
  const { email } = req.query;
  let results = bookingsStore;

  if (email) {
    results = bookingsStore.filter((b) => b.email === String(email).trim().toLowerCase());
  }

  res.json(results);
});

app.post('/api/bookings', (req: Request, res: Response) => {
  const body = req.body || {};

  if (!body.name || !body.email || !body.subsidiaries || !Array.isArray(body.subsidiaries) || body.subsidiaries.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, email, and at least one subsidiary.'
    });
  }

  const booking = {
    id: 'BK' + Date.now(),
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    phone: String(body.phone || '').trim(),
    date: String(body.date || '').trim(),
    subsidiaries: body.subsidiaries,
    notes: String(body.notes || '').trim(),
    hytDonation: Boolean(body.hytDonation),
    status: 'Pending',
    timestamp: new Date().toISOString()
  };

  bookingsStore.push(booking);
  saveBookingsToDisk();

  console.log(`✅ New booking saved: ${booking.id} by ${booking.name} (${booking.email})`);
  return res.status(201).json({ success: true, data: booking });
});

app.patch('/api/bookings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ['Pending', 'Approved', 'Rejected'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Allowed values: ${allowed.join(', ')}`
    });
  }

  const booking = bookingsStore.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: `Booking ${id} not found.` });
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();
  saveBookingsToDisk();

  console.log(`✏️  Booking ${id} status updated to: ${status}`);
  return res.json({ success: true, data: booking });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
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
  return res.status(201).json({
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

app.post('/api/auth/login', (req: Request, res: Response) => {
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

  return res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: String(user.email).trim().toLowerCase(),
      role: String(user.role || 'client').trim().toLowerCase()
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Klassic Group Corporate Hub Server');
  console.log('=====================================');
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💼 App: ${process.env.APP_NAME || 'Klassic Group Hub'}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🔌 API endpoint: http://${HOST}:${PORT}/api/subsidiaries`);
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
