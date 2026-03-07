const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = process.cwd();

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/tankGame.html';
  const filePath = path.join(ROOT, decodeURIComponent(reqPath));

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => {
  console.log(`Static server running: http://localhost:${PORT}/tankGame.html`);
});