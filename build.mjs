import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';

const FEED_URL = 'https://unbubblehub.substack.com/feed';
const MAX_POSTS = 5;
const EXCERPT_LEN = 180;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const stripHtml = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const pick = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return m ? m[1].trim() : '';
};

async function fetchPosts() {
  const res = await fetch(FEED_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status} from ${FEED_URL}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, MAX_POSTS);
  return items.map(([, block]) => {
    const raw = stripHtml(pick(block, 'description'));
    return {
      title: pick(block, 'title'),
      link: pick(block, 'link'),
      pubDate: pick(block, 'pubDate'),
      excerpt: raw.length > EXCERPT_LEN ? raw.slice(0, EXCERPT_LEN).trimEnd() + '…' : raw,
    };
  });
}

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

const template = await readFile('index.html', 'utf8');
const posts = await fetchPosts();
const html = template.replace('<!--POSTS-->', renderPosts(posts));

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
await copyFile('style.css', 'dist/style.css');
await cp('assets', 'dist/assets', { recursive: true });
await copyFile('CNAME', 'dist/CNAME');

console.log(`Built dist/ with ${posts.length} post${posts.length === 1 ? '' : 's'}.`);
