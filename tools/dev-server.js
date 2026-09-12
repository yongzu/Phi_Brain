#!/usr/bin/env node
// Local static server for previewing design/prototypes without deploying.
// Auto-reloads any open tab within ~1s of a file change under the served root.
// Usage: node tools/dev-server.js [root=design] [port=5500]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', process.argv[2] || 'design');
const port = Number(process.argv[3] || 5500);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

let version = Date.now();
fs.watch(root, { recursive: true }, () => { version = Date.now(); });

const RELOAD_SCRIPT = `<script>(function(){let v=null;setInterval(async()=>{try{const r=await fetch('/__reload');const j=await r.json();if(v===null){v=j.v;return;}if(j.v!==v)location.reload();}catch(e){}},700);})();</script>`;

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ v: version }));
    return;
  }
  if (url === '/') { res.writeHead(302, { Location: '/prototypes/home.html' }); res.end(); return; }
  const file = path.join(root, url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(ext === '.html' ? data.toString('utf8').replace('</body>', RELOAD_SCRIPT + '</body>') : data);
  });
}).listen(port, () => console.log(`Phi Brain dev server: http://localhost:${port}`));
