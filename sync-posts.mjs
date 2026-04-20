import { writeFile } from 'node:fs/promises';

const FEED_URL = 'https://unbubblehub.substack.com/feed';
const MAX_POSTS = 5;
const EXCERPT_LEN = 180;

const stripHtml = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const pick = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return m ? m[1].trim() : '';
};

const res = await fetch(FEED_URL, {
  headers: {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
    'accept-language': 'en-US,en;q=0.9',
  },
});
if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status} from ${FEED_URL}`);

const xml = await res.text();
const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, MAX_POSTS).map(([, block]) => {
  const raw = stripHtml(pick(block, 'description'));
  return {
    title: pick(block, 'title'),
    link: pick(block, 'link'),
    pubDate: pick(block, 'pubDate'),
    excerpt: raw.length > EXCERPT_LEN ? raw.slice(0, EXCERPT_LEN).trimEnd() + '…' : raw,
  };
});

await writeFile('posts.json', JSON.stringify(posts, null, 2) + '\n');
console.log(`Wrote posts.json with ${posts.length} post${posts.length === 1 ? '' : 's'}.`);
