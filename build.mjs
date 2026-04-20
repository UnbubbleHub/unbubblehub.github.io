import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const fmtDate = (s) => {
  const d = new Date(s);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

function renderPosts(posts) {
  if (!posts.length) {
    return '<p class="muted small">No posts yet. Follow the <a href="https://unbubblehub.substack.com">Substack</a> to be notified.</p>';
  }
  return '<ul class="posts">' + posts.map((p) => `
    <li>
      <a class="title" href="${esc(p.link)}">${esc(p.title)}</a>
      <div class="meta">${esc(fmtDate(p.pubDate))}</div>
      <p>${esc(p.excerpt)}</p>
    </li>`).join('') + '\n</ul>';
}

async function loadPosts() {
  try {
    return JSON.parse(await readFile('posts.json', 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('posts.json not found — run `npm run substack` to generate it.');
    }
    throw err;
  }
}

const template = await readFile('index.html', 'utf8');
const posts = await loadPosts();
const html = template.replace('<!--POSTS-->', renderPosts(posts));

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
await copyFile('style.css', 'dist/style.css');
await cp('assets', 'dist/assets', { recursive: true });
await copyFile('CNAME', 'dist/CNAME');

console.log(`Built dist/ with ${posts.length} post${posts.length === 1 ? '' : 's'}.`);
