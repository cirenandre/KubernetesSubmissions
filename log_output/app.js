const { randomUUID } = require('crypto');

const id = randomUUID();

setInterval(() => {
  console.log(`${id}: ${new Date().toISOString()}`);
}, 5000);
