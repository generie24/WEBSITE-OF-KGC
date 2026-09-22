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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(__dirname));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Routes
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

// API - subsidiaries
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
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

const path = require('path');
const express = require('express');
const app = express();

const path = require('path');
const express = require('express');
const app = express();

app.use(express.static(__dirname));
app.use('/images', express.static(path.join(__dirname, 'images')));
