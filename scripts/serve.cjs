const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function safePath(requestUrl) {
  const parsed = new URL(requestUrl, `http://127.0.0.1:${port}`);
  const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  return file.startsWith(root + path.sep) || file === root ? file : null;
}

const server = http.createServer((request, response) => {
  let file;
  try { file = safePath(request.url || '/'); } catch { file = null; }
  if (!file) { response.writeHead(400); response.end('Bad request'); return; }
  fs.stat(file, (statError, stats) => {
    const target = !statError && stats.isDirectory() ? path.join(file, 'index.html') : file;
    fs.readFile(target, (error, content) => {
      if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); return; }
      response.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(content);
    });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`模拟投资账户已启动：http://127.0.0.1:${port}/`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
