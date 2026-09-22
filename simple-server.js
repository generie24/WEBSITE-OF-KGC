const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const contentTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // API endpoints
  if (req.url === '/api/subsidiaries') {
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
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: subsidiaries.length, data: subsidiaries }));
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      app: 'Klassic Group Hub',
      version: '1.0.0'
    }));
    return;
  }

  // Serve static files
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = contentTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found', path: req.url }));
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n🚀 Klassic Group Corporate Hub Server');
  console.log('=====================================');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api/subsidiaries`);
  console.log('=====================================');
  console.log('\nPress Ctrl+C to stop the server\n');
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
