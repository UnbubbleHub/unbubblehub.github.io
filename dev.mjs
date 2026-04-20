import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join } from 'node:path';

const PORT = 4321;
const DIST = 'dist';
const WATCHED = ['index.html', 'style.css', 'build.mjs', 'posts.json'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

const LIVE_RELOAD = `
<script>
  (() => {
    const es = new EventSource('/__dev');
    es.addEventListener('reload', () => location.reload());
  })();
</script>`;

const clients = new Set();

function build() {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, ['build.mjs'], { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code !== 0) console.error(`✗ build exited ${code}`);
      resolve();
    });
  });
}

function notifyReload() {
  for (const res of clients) res.write('event: reload\ndata: \n\n');
}

async function serveFile(req, res) {
  let pathname = new URL(req.url, 'http://x').pathname;
  if (pathname === '/') pathname = '/index.html';
  const filePath = join(DIST, pathname);
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error('not a file');
    const ext = extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    if (ext === '.html') {
      const html = (await readFile(filePath, 'utf8'))
        .replace('</body>', `${LIVE_RELOAD}</body>`);
      res.writeHead(200, { 'content-type': mime });
      res.end(html);
    } else {
      res.writeHead(200, { 'content-type': mime });
      res.end(await readFile(filePath));
    }
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}

const server = createServer(async (req, res) => {
  if (req.url === '/__dev') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(':\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  await serveFile(req, res);
});

await build();
server.listen(PORT, () => {
  console.log(`→ http://localhost:${PORT}`);
  console.log(`  watching: ${WATCHED.join(', ')}`);
});

let debounce = null;
function trigger(label) {
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    console.log(`↻ ${label} changed — rebuild`);
    await build();
    notifyReload();
  }, 50);
}

for (const f of WATCHED) {
  watch(f, { persistent: true }, () => trigger(f));
}
