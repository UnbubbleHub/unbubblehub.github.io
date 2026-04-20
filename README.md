# unbubblehub.github.io

Static homepage for [UnbubbleHub](https://unbubblehub.org). Plain HTML + a tiny build script, deployed via GitHub Pages.

## Scripts

- `npm run dev` — local preview with live reload
- `npm run build` — render `dist/` from `index.html` + `posts.json`
- `npm run substack` — refresh `posts.json` from the Substack RSS feed

## Updating posts

After publishing on Substack:

```
npm run substack
git add posts.json
git commit -m "update posts"
git push
```

Substack's RSS is fetched only locally because Cloudflare blocks GitHub Actions IPs (403). `posts.json` is the committed source of truth consumed by the build.
