// Local dev server. Plain Node http, zero dependencies.
// On Vercel the same API runs from api/index.js and public/ is served as static files.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./lib/handler');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    let body = {};
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    }
    const [status, data] = handle(req.method, url.pathname, body);
    return send(res, status, data);
  }

  // Static files; unknown paths fall back to the SPA shell.
  let file = path.join(PUBLIC, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Demo running at http://localhost:${PORT}`));
