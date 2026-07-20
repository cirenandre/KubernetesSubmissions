const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const IMAGE_PATH = process.env.IMAGE_PATH || '/usr/src/app/files/image.jpg';
const IMAGE_CACHE_MINUTES = process.env.IMAGE_CACHE_MINUTES || 10;
const IMAGE_CACHE_MS = IMAGE_CACHE_MINUTES * 60 * 1000;
const IMAGE_SOURCE_URL = process.env.IMAGE_SOURCE_URL || 'https://picsum.photos/1200';
const TODO_BACKEND_URL = process.env.TODO_BACKEND_URL || 'http://todo-backend-svc:3000/todos';

let healthy = true;

async function getImage() {
  const isFresh =
    fs.existsSync(IMAGE_PATH) &&
    Date.now() - fs.statSync(IMAGE_PATH).mtimeMs < IMAGE_CACHE_MS;

  if (!isFresh) {
    const response = await fetch(IMAGE_SOURCE_URL);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(IMAGE_PATH), { recursive: true });
    fs.writeFileSync(IMAGE_PATH, buffer);
  }

  return fs.readFileSync(IMAGE_PATH);
}

async function getTodos() {
  try {
    const response = await fetch(TODO_BACKEND_URL);
    return await response.json();
  } catch (err) {
    return [];
  }
}

function renderPage(todos) {
  const todoItems = todos
    .map((todo) => {
      if (todo.done) {
        return `<li class="done"><span class="todo-text">${todo.text}</span><span class="done-label">Done</span></li>`;
      }
      return `<li><span class="todo-text">${todo.text}</span><form action="/mark-done/${todo.id}" method="POST"><button type="submit" class="done-btn">Mark done</button></form></li>`;
    })
    .join('');

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
    li { background: #f5f5f5; border-left: 4px solid #4caf50; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
    li.done { border-left-color: #9e9e9e; }
    li.done .todo-text { text-decoration: line-through; color: #757575; }
    li form { margin: 0; }
    .done-btn { background: #2196f3; }
    .done-label { color: #2e7d32; font-weight: bold; }
    .break-btn { background: #d9534f; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  <img src="/image" alt="random" />
  <form action="/todos" method="POST">
    <input type="text" name="todo" maxlength="140" placeholder="Enter a new todo (max 140 characters)" />
    <button type="submit">Send</button>
  </form>
  <h2>Todos</h2>
  <ul>${todoItems}</ul>
  <form action="/break" method="POST">
    <button type="submit" class="break-btn">break the app</button>
  </form>
</body>
</html>`;
}

function renderBrokenPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Todo App</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 2rem auto; text-align: center; }
    .failure { background: #fdecea; border: 1px solid #f5c6cb; border-radius: 8px; padding: 2rem; color: #7a1f1f; }
    .failure h1 { margin-top: 0; }
  </style>
</head>
<body>
  <div class="failure">
    <h1>System Failure</h1>
    <p>The Todo App is currently unhealthy. Please wait for recovery.</p>
  </div>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'text/plain' });
    res.end(healthy ? 'OK' : 'Unhealthy');
    return;
  }

  if (req.method === 'POST' && req.url === '/break') {
    healthy = false;
    console.log('App broken via /break');
    res.writeHead(303, { Location: '/' });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    if (!healthy) {
      res.writeHead(503, { 'Content-Type': 'text/html' });
      res.end(renderBrokenPage());
      return;
    }

    const todos = await getTodos();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderPage(todos));
    return;
  }

  const doneMatch = req.method === 'POST' && req.url.match(/^\/mark-done\/(\d+)$/);
  if (doneMatch) {
    const id = doneMatch[1];
    await fetch(`${TODO_BACKEND_URL}/${id}`, { method: 'PUT' });
    res.writeHead(303, { Location: '/' });
    res.end();
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
