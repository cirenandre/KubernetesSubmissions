const http = require('http');

const PORT = process.env.PORT || 3000;
const MAX_LENGTH = process.env.TODO_MAX_LENGTH || 140;

let todos = ['Learn Kubernetes basics', 'Deploy application to cluster', 'Configure persistent volumes'];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/todos') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(todos));
    return;
  }

  if (req.method === 'POST' && req.url === '/todos') {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const text = (params.get('todo') || '').trim().slice(0, MAX_LENGTH);

    if (text) {
      todos.push(text);
    }

    res.writeHead(303, { Location: '/' });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
