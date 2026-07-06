# Fan Passport

A static web app that matches soccer-curious fans to their ideal club across 7 leagues and 144 clubs. Answer a 7-question interview, get matched by identity and playing style, read a full dossier on your result, and share it.

## What's New in v2

**Intangible Matchmaking & NFL Bridge** — v2 replaces the geography shortcut with intangible tag dimensions, adds an NFL team selector, and introduces a persistent floating share bar.

### Key changes from v1

- **New tag system:** Every club now has `stability`, `fan-culture`, `ambition`, and `narrative` tags (one value each from 4 options per dimension). These replace geography-based quiz scoring.
- **Restructured quiz (Q1–Q7):**
  - Q1: Playing Philosophy (kept from v1)
  - Q2: Fan Culture Archetype (new — replaces v1 Q2)
  - Q3: Narrative Arc (refined from v1 Q3)
  - Q4: Rivalry Intensity (kept from v1)
  - Q5: Chaos vs. Stability (new — replaces geography)
  - Q6: Organizational Ambition (refined from v1 Q7)
  - Q7: NFL Team Selector (new — American sports bridge)
- **NFL team selector:** Q7 presents all 32 NFL teams in a conference/division grid. Each team maps to 2–3 soccer clubs via intangible profile similarity. Contributes ~15% of total match score. "I don't follow the NFL" skip option available (no boost applied).
- **Anti-shortcut scoring audit:** `scripts/audit-scoring.js` verifies no answer option concentrates >40% of tag weight into a single league. Run with `node scripts/audit-scoring.js`.
- **Floating share bar:** Persistent share bar appears on all post-result screens (result, dossier, browse) with club crest, name, match %, and Share button. Hidden when viewing via shared link. Dismissible.
- **Toast notifications:** "Link copied" feedback replaces the old share link box.
- **X/Twitter share:** Pre-filled tweet intent with match result.
- **Shared link CTA:** Users viewing via shared link see "Take the quiz yourself →" instead of the share bar.
- **FC Cincinnati fix:** Club ID corrected from placeholder to proper slug.

### Scoring (v2)

```
For each club:
  baseScore = sum of numeric tag matches (Q1, Q4) + intangible tag matches (Q2, Q3, Q5, Q6)
  nflBoost = 0 if skipped or no NFL team
           = weight × 0.15 × maxBaseScore if club is in NFL mapping
  totalScore = baseScore + nflBoost

Rank all clubs by totalScore, return top match + 2 runners-up
```

### Tag assignment guide

| Tag | Values | Assignment criteria |
|---|---|---|
| `stability` | stable / chaotic / rebuilding / win-now | Institutional patience, managerial turnover, ownership stability |
| `fan-culture` | ultras / family / intellectual / rebel | Supporter culture, matchday experience, political engagement |
| `ambition` | trophy-driven / identity-driven / smart-overachiever / romantic | Trophy expectation vs. identity prioritization vs. overachievement |
| `narrative` | underdog / dynasty / cursed / project | Club's story arc: rising, dominant, suffering, or building |

## Tech Stack

- 100% static: `index.html` + `app.js` + `style.css` + `clubs.json` + `quiz.json`
- No backend, no build step, no dependencies
- localStorage for persistence
- Base64-encoded shareable URLs (`?r=<base64>`)
- Per-club OG share card images in `og/`

## Project Structure

```
Fan Passport/
├── index.html              # App shell + OG meta tags (unchanged in v2)
├── app.js                  # All app logic (quiz, matching, rendering, sharing, share bar)
├── style.css               # Passport-aesthetic styles + NFL grid + share bar + toast
├── clubs.json              # 144 club profiles with v2 intangible tags
├── quiz.json               # v2 quiz structure (7 questions + NFL mapping)
├── schema.md               # Data schema reference
├── og/                     # 144 per-club OG share card PNGs (1200x630)
├── og-share-card.png       # Default/generic OG share card
├── vercel.json             # Vercel deployment config
├── scripts/
│   ├── add-v2-tags.js         # One-time script: adds v2 tags to clubs.json
│   ├── validate-tags.js       # Dead/orphaned tag validator + tag distribution stats
│   ├── audit-scoring.js       # Anti-shortcut scoring audit (re-runnable)
│   └── audit-reachability.js  # Brute-forces every quiz combo, reports which clubs can ever place #1
└── README.md               # This file
```

## Local Development

```bash
cd "Fan Passport"
python3 -m http.server 8000
# Open http://127.0.0.1:8000
```

You must serve via HTTP — opening `index.html` via `file://` won't work because `fetch()` can't load local JSON.

## Scoring Audit

After any tag or quiz changes, run the anti-shortcut audit:

```bash
node scripts/audit-scoring.js
```

This checks that no answer option across Q1–Q6 concentrates >40% of its tag weight into a single league. The audit also verifies that all NFL mapping club IDs exist in clubs.json and flags any NFL team whose mapped clubs are all from the same league.

Also run the reachability audit, which checks a different failure mode — not "does one answer favor a league" but "can this club mathematically ever win at all":

```bash
node scripts/audit-reachability.js
```

This brute-forces all 135,168 possible quiz outcomes (4⁶ Q1–Q6 combinations × 33 Q7 NFL options) and reports how many of the 144 clubs ever place #1, how concentrated the top results are, and the win share by league. Re-run after any tag change to confirm you haven't made a club (or a whole league) unreachable.

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