const http = require('http');

const PORT = process.env.PORT || 3000;
let counter = 0;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/pingpong') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${counter}`);
    counter++;
    return;
  }

  if (req.method === 'GET' && req.url === '/pings') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(String(counter));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
