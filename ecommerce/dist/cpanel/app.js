process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const http = require('http');
const next = require('next');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

if (!Number.isFinite(port) || port < 1) {
  throw new Error('Invalid PORT value. Set a valid PORT in cPanel Node.js app settings.');
}

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));
    server.listen(port, hostname, () => {
      console.log('Next server listening on ' + hostname + ':' + port);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
