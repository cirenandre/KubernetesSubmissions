const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const COUNTER_FILE_PATH = process.env.COUNTER_FILE_PATH || '/usr/src/app/files/pingpong.txt';
let counter = 0;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/pingpong') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${counter}`);
    counter++;
    fs.writeFileSync(COUNTER_FILE_PATH, String(counter));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
