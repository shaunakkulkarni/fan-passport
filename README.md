# Fan Passport

A static web app that matches soccer-curious fans to their ideal club across 7 leagues and 144 clubs. Answer a 7-question interview, get matched by identity and playing style, read a full dossier on your result, and share it.

## Tech Stack

- 100% static: `index.html` + `app.js` + `style.css` + `clubs.json` + `quiz.json`
- No backend, no build step, no dependencies
- localStorage for persistence
- Base64-encoded shareable URLs (`?r=<base64>`)
- Per-club OG share card images in `og/`

## Project Structure

```
Fan Passport/
├── index.html          # App shell + OG meta tags
├── app.js              # All app logic (quiz, matching, rendering, sharing)
├── style.css           # Passport-aesthetic styles (paper/pitch/ink palette)
├── clubs.json          # 144 club profiles (DO NOT EDIT — data is verified)
├── quiz.json           # 7 questions + tag labels (DO NOT EDIT)
├── schema.md           # Data schema reference (DO NOT EDIT)
├── og/                 # 144 per-club OG share card PNGs (1200x630)
├── og-share-card.png    # Default/generic OG share card
├── vercel.json         # Vercel deployment config
├── scripts/
│   └── generate-og-cards.py  # Regenerates og/ from clubs.json
└── README.md           # This file
```

## Local Development

```bash
cd "Fan Passport"
python3 -m http.server 8000
# Open http://127.0.0.1:8000
```

You must serve via HTTP — opening `index.html` via `file://` won't work because `fetch()` can't load local JSON.

## Deploy to Vercel

1. Push the project to a Git repo (GitHub, GitLab, or Bitbucket).
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Framework preset: **Other** (static site). No build command, no output directory — the root is the output.
4. `vercel.json` handles clean URLs and rewrites so shareable links (`/?r=base64`) resolve to `index.html`.
5. Deploy. Done.

Or via CLI:
```bash
npm i -g vercel
cd "Fan Passport"
vercel --prod
```

## Deploy to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create a project → Connect your Git repo.
2. Framework preset: **None**.
3. Build command: (leave empty)
4. Output directory: `/` (root)
5. Save and deploy.

Or via CLI:
```bash
npm i -g wrangler
cd "Fan Passport"
wrangler pages deploy . --project-name=fan-passport
```

## Regenerating OG Share Cards

The `og/` directory contains 144 per-club PNGs (1200x630). To regenerate (e.g. after updating club colors):

```bash
python3 scripts/generate-og-cards.py
```

Requires Python 3 with Pillow (`pip install Pillow`).

## OG Image Limitation

Most social media scrapers (Facebook, Twitter/X, Slack, iMessage) read Open Graph meta tags **server-side** — they fetch the HTML and parse it without executing JavaScript. Since this is a static site with no server-side rendering:

- **Shareable result URLs** (`/?r=base64`) will show the **default generic** `og-share-card.png` in scrapers, not the per-club image, because the server doesn't know which club the `?r=` param resolves to.
- The app **dynamically updates** `og:image` to `og/<club-id>.png` via JavaScript when rendering the result page, but this only helps platforms that re-read meta tags after JS execution (rare) or browser-native share sheets.
- To get per-club OG images working fully with scrapers, you'd need an edge function (Vercel Edge Function or Cloudflare Pages Function) that reads the `?r=` param, decodes the answers server-side, determines the club, and injects the correct `og:image` tag into the HTML before serving it. This is a known future enhancement.

## License

Personal project. All club data is independently researched.