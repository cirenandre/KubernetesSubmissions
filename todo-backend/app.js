const http = require('http');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const MAX_LENGTH = process.env.TODO_MAX_LENGTH || 140;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'todo-postgres-svc',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'todos',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

const DEFAULT_TODOS = ['Learn Kubernetes basics', 'Deploy application to cluster', 'Configure persistent volumes'];

async function initDb() {
  await pool.query('CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, text TEXT NOT NULL)');

  const { rows } = await pool.query('SELECT COUNT(*) FROM todos');
  if (Number(rows[0].count) === 0) {
    for (const text of DEFAULT_TODOS) {
      await pool.query('INSERT INTO todos (text) VALUES ($1)', [text]);
    }
  }
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && req.url === '/readyz') {
    try {
      await pool.query('SELECT 1');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Database unavailable');
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/todos') {
    const { rows } = await pool.query('SELECT text FROM todos ORDER BY id');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rows.map((row) => row.text)));
    return;
  }

  if (req.method === 'POST' && req.url === '/todos') {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const text = (params.get('todo') || '').trim();

    if (text.length > MAX_LENGTH) {
      console.log(`Rejected todo, too long (${text.length} > ${MAX_LENGTH} characters): ${text}`);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`Todo must be at most ${MAX_LENGTH} characters`);
      return;
    }

    if (text) {
      console.log(`Creating todo: ${text}`);
      await pool.query('INSERT INTO todos (text) VALUES ($1)', [text]);
    }

    res.writeHead(303, { Location: '/' });
    res.end();
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
