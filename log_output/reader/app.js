const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const FILE_PATH = process.env.FILE_PATH || '/usr/src/app/files/status.txt';
const PING_PONG_URL = process.env.PING_PONG_URL || 'http://ping-pong-svc:3000/pings';
const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || '/usr/src/app/config/information.txt';
const MESSAGE = process.env.MESSAGE || '';

async function getPingPongCount() {
  try {
    const response = await fetch(PING_PONG_URL);
    return (await response.text()).trim();
  } catch (err) {
    return '0';
  }
}

async function canReachPingPong() {
  try {
    const response = await fetch(PING_PONG_URL);
    return response.ok;
  } catch (err) {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/readyz') {
    if (await canReachPingPong()) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Ping-pong unavailable');
    }
    return;
  }

  const status = fs.existsSync(FILE_PATH) ? fs.readFileSync(FILE_PATH, 'utf-8').trim() : '';
  const count = await getPingPongCount();
  const information = fs.existsSync(CONFIG_FILE_PATH) ? fs.readFileSync(CONFIG_FILE_PATH, 'utf-8').trim() : '';

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`${status}\nPing / Pongs: ${count}\nMESSAGE: ${MESSAGE}\nFile content: ${information}\n`);
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
