const app = require('./server.js');
const http = require('http');

const server = app.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const payload = JSON.stringify({
    name: 'Pending Admin',
    company: 'KGC',
    email: 'pendingadmin3@example.com',
    phone: '123',
    password: 'abc123',
    role: 'admin'
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const body = JSON.parse(data || '{}');
      console.log('REGISTER_STATUS=' + res.statusCode);
      console.log('REGISTER_MESSAGE=' + (body.message || ''));

      const loginPayload = JSON.stringify({
        email: 'pendingadmin3@example.com',
        password: 'abc123',
        role: 'admin'
      });

      const req2 = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginPayload)
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const body2 = JSON.parse(data2 || '{}');
          console.log('LOGIN_STATUS=' + res2.statusCode);
          console.log('LOGIN_ERROR=' + (body2.error || ''));
          server.close(() => process.exit((res.statusCode === 201 && res2.statusCode === 403) ? 0 : 1));
        });
      });

      req2.on('error', err => {
        console.error(err.message);
        server.close(() => process.exit(1));
      });

      req2.write(loginPayload);
      req2.end();
    });
  });

  req.on('error', err => {
    console.error(err.message);
    server.close(() => process.exit(1));
  });

  req.write(payload);
  req.end();
});
