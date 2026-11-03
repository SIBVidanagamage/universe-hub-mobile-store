const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogg': 'video/ogg',
  '.pdf': 'application/pdf'
};

function generateSafeName(origName, defaultExt = '.png') {
  const ext = (path.extname(origName) || defaultExt).toLowerCase();
  const cleanBase = path.basename(origName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32) || 'media';
  return `${cleanBase}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:' + PORT}`);
  const reqPath = urlObj.pathname;

  // 1. Direct File Upload API endpoint
  if (req.method === 'POST' && reqPath === '/api/upload') {
    const contentType = req.headers['content-type'] || '';
    
    // Base64 JSON upload
    if (contentType.includes('application/json')) {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 100 * 1024 * 1024) { // 100MB limit
          req.destroy();
        }
      });

      req.on('end', () => {
        try {
          const json = JSON.parse(body);
          const origName = json.filename || 'upload.png';
          const safeName = generateSafeName(origName, path.extname(origName) || '.png');
          const savePath = path.join(UPLOAD_DIR, safeName);

          let base64Data = json.data || '';
          if (base64Data.includes(';base64,')) {
            base64Data = base64Data.split(';base64,').pop();
          }

          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFile(savePath, buffer, (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              url: `/uploads/${safeName}`,
              filename: safeName,
              originalName: origName,
              size: buffer.length
            }));
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    // Direct Binary Stream upload: POST /api/upload?filename=photo.png
    const origName = urlObj.searchParams.get('filename') || 'upload-' + Date.now();
    const safeName = generateSafeName(origName, path.extname(origName) || '.png');
    const savePath = path.join(UPLOAD_DIR, safeName);
    const writeStream = fs.createWriteStream(savePath);

    let bytesReceived = 0;
    req.on('data', chunk => {
      bytesReceived += chunk.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        url: `/uploads/${safeName}`,
        filename: safeName,
        originalName: origName,
        size: bytesReceived
      }));
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // 2. Static File Serving with Range Support for Video Streaming
  let filePath = (reqPath === '/' || reqPath === '') ? '/index.html' : reqPath;
  const targetFile = path.normalize(path.join(__dirname, filePath));

  // Security: prevent path traversal outside workspace
  if (!targetFile.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(targetFile, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // HTTP 206 Partial Content for video seeking / streaming
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mov' || ext === '.ogg')) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(targetFile, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      fileStream.pipe(res);
      return;
    }

    // Normal static file streaming
    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const fileStream = fs.createReadStream(targetFile);
    fileStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Universe Hub server running at http://localhost:${PORT}`);
  console.log(`Uploads directory ready at: ${UPLOAD_DIR}`);
});
