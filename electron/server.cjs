const http = require('http');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

/**
 * Starts a minimal, secure local static server serving the dist directory.
 * Binds exclusively to 127.0.0.1.
 * Provides SPA fallback to index.html and prevents directory traversal.
 *
 * @param {number} port - Fixed port (47831)
 * @param {string} distDirectory - Absolute path to dist directory
 * @returns {Promise<http.Server>}
 */
function startStaticServer(port = 47831, distDirectory = path.join(__dirname, '..', 'dist')) {
  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(distDirectory);

    const server = http.createServer((req, res) => {
      // Allow only GET and HEAD methods
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      // Parse and sanitize URL pathname
      let reqUrl = '/';
      try {
        const parsed = new URL(req.url, `http://127.0.0.1:${port}`);
        reqUrl = decodeURIComponent(parsed.pathname);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad Request');
        return;
      }

      // Prevent directory traversal attacks
      let safePath = path.normalize(path.join(rootDir, reqUrl));
      if (!safePath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      // Check file existence
      fs.stat(safePath, (err, stats) => {
        let targetFile = safePath;

        if (err || !stats.isFile()) {
          // If path is a directory, try index.html inside it
          if (stats && stats.isDirectory()) {
            const dirIndex = path.join(safePath, 'index.html');
            if (fs.existsSync(dirIndex)) {
              targetFile = dirIndex;
            } else {
              targetFile = path.join(rootDir, 'index.html');
            }
          } else {
            // SPA Fallback: serve root index.html for router URLs
            targetFile = path.join(rootDir, 'index.html');
          }
        }

        // Final check on targetFile
        fs.stat(targetFile, (statErr, finalStats) => {
          if (statErr || !finalStats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Dosya bulunamadı.');
            return;
          }

          const ext = path.extname(targetFile).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';

          const headers = {
            'Content-Type': contentType,
            'Content-Length': finalStats.size,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
          };

          res.writeHead(200, headers);

          if (req.method === 'HEAD') {
            res.end();
            return;
          }

          const stream = fs.createReadStream(targetFile);
          stream.on('error', () => {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            }
            res.end('Sunucu hatası.');
          });
          stream.pipe(res);
        });
      });
    });

    server.once('error', (err) => {
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[Electron Static Server] 127.0.0.1:${port} üzerinde dist klasörü sunuluyor.`);
      resolve(server);
    });
  });
}

module.exports = {
  startStaticServer,
};
