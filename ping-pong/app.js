const http = require('http');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres-svc',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'pingpong',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

async function initDb() {
  await pool.query('CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY, count INTEGER NOT NULL)');
  await pool.query('INSERT INTO counter (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING');
}

async function waitForDb() {
  while (true) {
    try {
      await pool.query('SELECT 1');
      await initDb();
      console.log('Connected to database');
      return;
    } catch (err) {
      console.log('Waiting for database...', err.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function incrementCounter() {
  const result = await pool.query('UPDATE counter SET count = count + 1 WHERE id = 1 RETURNING count');
  return result.rows[0].count - 1;
}

async function getCounter() {
  const result = await pool.query('SELECT count FROM counter WHERE id = 1');
  return result.rows[0].count;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && req.url === '/pingpong') {
    try {
      const count = await incrementCounter();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`pong ${count}`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Database error');
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/pings') {
    try {
      const count = await getCounter();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(String(count));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Database error');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

waitForDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server started in port ${PORT}`);
  });
});
