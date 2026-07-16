const http = require('http');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const id = randomUUID();

setInterval(() => {
  console.log(`${id}: ${new Date().toISOString()}`);
}, 5000);

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`${id}: ${new Date().toISOString()}`);
  })
  .listen(PORT);
