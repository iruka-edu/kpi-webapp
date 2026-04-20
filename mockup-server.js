/**
 * mockup-server.js — IruKa Mockup Dev Server
 * ─────────────────────────────────────────────
 * Vai trò  : Serve file tĩnh + nhận POST /save-file để ghi HTML trực tiếp vào ổ cứng
 * Cách chạy: node mockup-server.js   (trong thư mục kpi-webapp/)
 * Truy cập : http://localhost:7474/mockup/evaluation-mockup.html
 * ─────────────────────────────────────────────
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = 7474;
const ROOT = __dirname; // thư mục gốc = nơi chạy file này

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js'  : 'application/javascript',
  '.css' : 'text/css',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff' : 'font/woff',
};

// ─── CORS header cho mọi response ───────────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── Kiểm tra đường dẫn an toàn (không cho ra khỏi ROOT) ────────────────────
function safeResolve(reqPath) {
  const abs = path.resolve(ROOT, '.' + reqPath);
  return abs.startsWith(ROOT) ? abs : null;
}

// ─── Main handler ────────────────────────────────────────────────────────────
const server = http.createServer(function (req, res) {
  setCORS(res);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // POST /save-file — ghi HTML vào ổ cứng (từ iruka-commenter.js)
  if (req.method === 'POST' && req.url === '/save-file') {
    var body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {
      try {
        var data     = JSON.parse(body);
        var filePath = data.filePath;   // VD: /mockup/evaluation-mockup.html
        var html     = data.html;       // nội dung HTML sạch
        if (!filePath || !html) throw new Error('Thiếu filePath hoặc html');

        var absPath = safeResolve(filePath);
        if (!absPath) { res.writeHead(403); res.end('Forbidden'); return; }

        fs.writeFileSync(absPath, html, 'utf8');
        console.log('[SAVED]', filePath, '—', new Date().toLocaleTimeString());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved: filePath }));
      } catch (e) {
        console.error('[ERROR] save-file:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // GET — serve file tĩnh
  var pathname = url.parse(req.url).pathname;
  if (pathname === '/') pathname = '/index.html';

  var absPath = safeResolve(pathname);
  if (!absPath) { res.writeHead(403); res.end('Forbidden'); return; }

  // Nếu là thư mục → liệt kê file
  if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
    var files = fs.readdirSync(absPath);
    var base  = pathname.endsWith('/') ? pathname : pathname + '/';
    var links = files.map(function (f) {
      return '<li><a href="' + base + f + '">' + f + '</a></li>';
    }).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!DOCTYPE html><html><body><ul>' + links + '</ul></body></html>');
    return;
  }

  // Serve file
  var ext  = path.extname(absPath);
  var mime = MIME[ext] || 'application/octet-stream';
  try {
    var content = fs.readFileSync(absPath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (e) {
    res.writeHead(404); res.end('Not found: ' + pathname);
  }
});

server.listen(PORT, function () {
  console.log('');
  console.log('🚀  IruKa Mockup Server đang chạy tại:');
  console.log('    http://localhost:' + PORT);
  console.log('');
  console.log('📁  Thư mục gốc : ' + ROOT);
  console.log('💾  Auto-save   : POST /save-file');
  console.log('');
  console.log('🔗  Truy cập mockup:');
  console.log('    http://localhost:' + PORT + '/mockup/evaluation-mockup.html');
  console.log('');
});
