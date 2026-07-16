const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const FILE_PATH = process.env.FILE_PATH || '/usr/src/app/files/status.txt';
const COUNTER_FILE_PATH = process.env.COUNTER_FILE_PATH || '/usr/src/app/files/pingpong.txt';

const server = http.createServer((req, res) => {
  const status = fs.existsSync(FILE_PATH) ? fs.readFileSync(FILE_PATH, 'utf-8').trim() : '';
  const count = fs.existsSync(COUNTER_FILE_PATH) ? fs.readFileSync(COUNTER_FILE_PATH, 'utf-8').trim() : '0';

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`${status}\nPing / Pongs: ${count}\n`);
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
