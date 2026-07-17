const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const FILE_PATH = process.env.FILE_PATH || '/usr/src/app/files/status.txt';
const PING_PONG_URL = process.env.PING_PONG_URL || 'http://ping-pong-svc:3000/pings';

async function getPingPongCount() {
  try {
    const response = await fetch(PING_PONG_URL);
    return (await response.text()).trim();
  } catch (err) {
    return '0';
  }
}

const server = http.createServer(async (req, res) => {
  const status = fs.existsSync(FILE_PATH) ? fs.readFileSync(FILE_PATH, 'utf-8').trim() : '';
  const count = await getPingPongCount();

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`${status}\nPing / Pongs: ${count}\n`);
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
