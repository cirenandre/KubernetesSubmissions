const http = require('http');
const { connect, StringCodec } = require('nats');

const PORT = process.env.PORT || 3000;
const NATS_URL = process.env.NATS_URL || 'nats://nats-svc:4222';
const NATS_SUBJECT = process.env.NATS_SUBJECT || 'todos';
const NATS_QUEUE_GROUP = process.env.NATS_QUEUE_GROUP || 'broadcaster';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const sc = StringCodec();
let connected = false;

function messageFor(event, text) {
  if (event === 'created') return `A todo was created: ${text}`;
  if (event === 'updated') return `A todo was marked done: ${text}`;
  return `Todo event (${event}): ${text}`;
}

async function sendToWebhook(message) {
  if (!WEBHOOK_URL) {
    console.log('WEBHOOK_URL not set, skipping send:', message);
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'bot', message }),
    });
    console.log(`Sent to webhook, status ${response.status}: ${message}`);
  } catch (err) {
    console.log('Failed to send to webhook:', err.message);
  }
}

async function subscribeToNats() {
  while (true) {
    try {
      const nc = await connect({ servers: NATS_URL });
      connected = true;
      console.log('Connected to NATS');

      const sub = nc.subscribe(NATS_SUBJECT, { queue: NATS_QUEUE_GROUP });
      console.log(`Subscribed to "${NATS_SUBJECT}" in queue group "${NATS_QUEUE_GROUP}"`);

      for await (const msg of sub) {
        const data = JSON.parse(sc.decode(msg.data));
        await sendToWebhook(messageFor(data.event, data.text));
      }

      connected = false;
      console.log('NATS subscription ended, reconnecting...');
    } catch (err) {
      connected = false;
      console.log('NATS connection error, retrying...', err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/readyz') {
    res.writeHead(connected ? 200 : 503, { 'Content-Type': 'text/plain' });
    res.end(connected ? 'OK' : 'Not connected to NATS');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

subscribeToNats();
server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
