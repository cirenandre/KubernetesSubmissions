const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const IMAGE_PATH = process.env.IMAGE_PATH || '/usr/src/app/files/image.jpg';
const IMAGE_CACHE_MS = 10 * 60 * 1000;

async function getImage() {
  const isFresh =
    fs.existsSync(IMAGE_PATH) &&
    Date.now() - fs.statSync(IMAGE_PATH).mtimeMs < IMAGE_CACHE_MS;

  if (!isFresh) {
    const response = await fetch('https://picsum.photos/1200');
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(IMAGE_PATH), { recursive: true });
    fs.writeFileSync(IMAGE_PATH, buffer);
  }

  return fs.readFileSync(IMAGE_PATH);
}

const TODOS = ['Learn Kubernetes basics', 'Deploy application to cluster', 'Configure persistent volumes'];

function renderPage() {
  const todoItems = TODOS.map((todo) => `<li>${todo}</li>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Todo App</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 2rem auto; text-align: center; }
    img { max-width: 300px; border-radius: 8px; }
    form { margin: 1.5rem 0; display: flex; gap: 0.5rem; }
    input { flex: 1; padding: 0.5rem; font-size: 1rem; }
    button { padding: 0.5rem 1rem; font-size: 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; }
    ul { list-style: none; padding: 0; text-align: left; }
    li { background: #f5f5f5; border-left: 4px solid #4caf50; padding: 0.75rem; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  <img src="/image" alt="random" />
  <form>
    <input type="text" maxlength="140" placeholder="Enter a new todo (max 140 characters)" />
    <button type="submit">Send</button>
  </form>
  <h2>Todos</h2>
  <ul>${todoItems}</ul>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderPage());
    return;
  }

  if (req.method === 'GET' && req.url === '/image') {
    const image = await getImage();
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(image);
    return;
  }

  if (req.method === 'GET' && req.url === '/crash') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Crashing for testing purposes');
    process.exit(1);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});
