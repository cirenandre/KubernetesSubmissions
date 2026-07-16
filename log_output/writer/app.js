const fs = require('fs');
const { randomUUID } = require('crypto');

const FILE_PATH = process.env.FILE_PATH || '/usr/src/app/files/status.txt';
const id = randomUUID();

setInterval(() => {
  fs.writeFileSync(FILE_PATH, `${new Date().toISOString()}: ${id}\n`);
}, 5000);
