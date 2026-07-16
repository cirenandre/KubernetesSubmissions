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

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      '<h1>Todo app</h1>' +
        '<p>Server started in port ' +
        PORT +
        '</p>' +
        '<img src="/image" alt="random" />'
    );
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
