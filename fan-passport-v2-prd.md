# PRD: Fan Passport v2 — Intangible Matchmaking & NFL Bridge

**Status:** Draft for build handoff  
**Owner:** Shaunak  
**Version:** v2 (v1 shipped at fan-passport-abz.pages.dev)  
**Date:** July 1, 2026  

---

## 1. Problem Statement

### What v1 got right
- 144 clubs across 7 leagues with full dossiers — data depth is genuine
- Passport/parchment visual identity — editorial, not templated
- Shareable links via base64 URL params — works, verified in production
- Quick retake, full retake, browse directory — all functional
- Per-club OG share cards (144 PNGs) — generated and deployed
- localStorage persistence — quiz state survives refresh
- Static architecture — no backend, trivial hosting, fast load

### What v1 got wrong (and v2 must fix)

**Critical: The geography shortcut.** Q5 ("Where do you want your club to be?") lets users pick a region that maps ~1:1 to a league. This collapses the quiz's value — instead of matching on identity, users self-select into a league. A user who likes French playing culture shouldn't be forced into Ligue 1 just because they picked "France." Beta testing confirmed: one user effectively dictated their result league through Q5 alone.

**Critical: No persistent share button.** Share exists only on the result ("entry granted") screen. Once the user clicks into a dossier, there's no way to share. The share impulse strikes at various points — not just the reveal moment.

**Important: Questions lean on easy attributes.** Q5 (geography) and Q6 (access/attendance) reward surface-level matching. Q1 (playing philosophy) was praised as the gold standard because it's intangible and scenario-framed. v2 needs more Q1-style questions and fewer attribute-pickers.

**Opportunity: No American sports bridge.** The target audience is American soccer-curious fans. They already have NFL allegiances with rich intangible profiles. Mapping NFL team identity → soccer club identity gives users a familiar anchor point and makes the quiz feel native rather than foreign.

---

## 2. Goals for v2

1. **Replace geography with intangibles.** Every quiz dimension must differentiate clubs across AND within leagues. No single answer may funnel >40% of its scoring weight into one league.
2. **Add NFL team selector.** Users pick their favorite NFL team (all 32 covered). The selection maps to 2-3 soccer clubs via intangible profile similarity (culture, philosophy, ambition, fan archetype — NOT colors, city, or star players).
3. **Persistent share bar.** A floating/sticky share button visible on every screen after the club is assigned — result page, dossier, browse. Share link always goes to the result page, not the current screen.
4. **Refine quiz to 7 questions, all intangible.** Replace Q5 (geography) and Q6 (access) with intangible dimensions. Keep total at 7.
5. **Anti-shortcut scoring audit.** Programmatically verify that no answer option concentrates >40% of tag weight into a single league.
6. **Remain static.** No backend. Same architecture as v1.

---

## 3. Detailed Quiz Spec

### Question design principles
- **Scenario-framed, not attribute-named.** Questions present a situation or preference, not a literal attribute label. "Your team is up 1-0 in the 80th minute — what do you want to see?" not "Do you prefer attacking or defensive football?"
- **Zero soccer knowledge required.** All questions answerable by someone who has never watched a match. Use metaphor and American sports framing.
- **Every answer spreads across leagues.** No answer maps to a single league. Audit the scoring matrix.
- **Each question differentiates within leagues too.** E.g., "Chaos vs Stability" separates Juventus (stable) from Roma (chaotic) within Serie A, AND Bayern (stable) from Marseille (chaos) across leagues.

### The 7 Questions

#### Q1: Playing Philosophy (KEEP from v1 — gold standard)
**Prompt:** "How do you want your club to win?"
**Subtext:** "Pick the version of football that gets you off the couch."

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | Total control | Death by a thousand passes — starve the opponent of the ball until they break. | `possession`, `control`, `tactical` |
| B | The knockout blow | Sit deep, absorb pressure, then hit them on the break before they know what happened. | `counter`, `defensive`, `pragmatic` |
| C | Organized chaos | End-to-end, high-event, nobody's defense is safe. Entertainment over control. | `attacking`, `open`, `entertainment` |
| D | Grind it out | Set pieces, duels, a back line that doesn't blink. Ugly wins still count. | `physical`, `defensive`, `set-piece` |

**League spread audit:** A → PL, La Liga, Bundesliga, Serie A. B → Serie A, Ligue 1, Liga MX, PL. C → Bundesliga, PL, MLS, Liga MX. D → PL, Serie A, Bundesliga, Liga MX. ✅ No option >40% into one league.

#### Q2: Fan Culture Archetype (NEW — replaces v1 Q2 with sharper intangible)
**Prompt:** "When you picture yourself at a match, what's the scene?"
**Subtext:** "There's no wrong answer — just the version of fandom that feels like yours."

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | The wall of noise | Thousands standing, singing for 90 minutes straight. The stadium IS the experience. You don't sit, you don't stop. | `ultras`, `atmosphere`, `traditional` |
| B | The family outing | Good view, clean concourse, kids running around. Football as a Saturday event, not a religious experience. | `family-friendly`, `modern`, `community` |
| C | The intellectual | You're there for the tactical chess match. You want to analyze formations, debate substitutions, appreciate the system. | `tactical`, `intellectual`, `system` |
| D | The rebels | The fans who march, protest, fight ownership. Football is political, and your club takes a side. | `rebellious`, `working-class`, `anti-establishment` |

**League spread audit:** A → Bundesliga, Serie A, Liga MX, PL. B → MLS, PL, Ligue 1. C → PL, La Liga, Serie A, Bundesliga. D → La Liga, Ligue 1, PL, Liga MX. ✅ No option >40% into one league.

#### Q3: Narrative Arc (REFINE from v1 Q3 — sharper scenario framing)
**Prompt:** "What kind of story do you want to be part of?"
**Subtext:** "Every club has a narrative. Which one is yours?"

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | The underdog rising | A club that punches above its weight, shocks the giants, makes you believe in miracles. Think Leicester 2016. | `underdog`, `overachiever`, `romantic` |
| B | The dynasty | A club that expects to win. Every year. The pressure is the point — anything less than a trophy is failure. | `establishment`, `winning`, `pressure` |
| C | The cursed romantic | Long-suffering, loyal through decades of heartbreak. The pain IS the identity. One day it'll be worth it. | `long-suffering`, `loyal`, `dramatic` |
| D | The project | A club building something new — smart recruitment, young talent, a vision taking shape. You want to watch the ascent. | `developmental`, `modern`, `project` |

**League spread audit:** A → all 7 leagues (every league has underdogs). B → PL, La Liga, Bundesliga, Serie A, Liga MX. C → PL, Serie A, Liga MX, Ligue 1. D → Bundesliga, MLS, PL, Ligue 1. ✅ No option >40% into one league.

#### Q4: Rivalry Intensity (KEEP from v1 Q4 — works well)
**Prompt:** "How do you want your club to handle rivalries?"
**Subtext:** "Some rivalries are family feuds. Some are blood feuds."

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | Toxic and beautiful | The derby is everything. You hate the rival more than you love your own team. Losing to them is unthinkable. | `fierce-rivalry`, `tribal`, `passionate` |
| B | Respectful but real | There's history, there's tension, but it stays on the pitch. You want edge, not venom. | `respectful-rivalry`, `sporting` |
| C | I don't care about rivalries | I'm here for the football, not the grudges. Rivalry culture is fine but it's not my identity. | `low-rivalry`, `neutral` |
| D | The enemy of my enemy | I want a club whose rivals are clubs I already dislike by reputation. Give me a side with enemies worth having. | `narrative-rivalry`, `story-driven` |

**League spread audit:** A → Serie A, La Liga, Liga MX, PL. B → Bundesliga, PL, Ligue 1. C → MLS, all leagues (universal). D → all leagues. ✅ No option >40% into one league.

#### Q5: Chaos vs. Stability (NEW — REPLACES geography)
**Prompt:** "What's your tolerance for institutional drama?"
**Subtext:** "Some clubs are rock-solid institutions. Others are a beautiful mess."

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | Rock solid | I want stability — long-term vision, a sporting director with a plan, no annual crisis. Boring excellence is fine by me. | `stable`, `institutional`, `patient` |
| B | Beautiful chaos | I can handle the drama — manager changes, owner scandals, transfer sagas. The chaos is part of the charm. | `chaotic`, `dramatic`, `passionate` |
| C | Rebuild in progress | I want a club that's actively fixing something. New ownership, new philosophy, a turnaround story. | `rebuilding`, `transitional`, `project` |
| D | Win now, figure it out later | I don't care about the next five years. I want trophies THIS year. Spend money, hire the best, deal with consequences later. | `win-now`, `aggressive`, `ambitious` |

**League spread audit:** A → Bayern, Juventus, Real Madrid, Sevilla, Club América, Inter Milan (spans 5 leagues). B → Marseille, Roma, Tottenham, Cruz Azul, Monterrey (spans 5 leagues). C → all 7 leagues (every league has rebuilding clubs). D → PSG, Chelsea, Man City, Tigres, LAFC (spans 4 leagues). ✅ No option >40% into one league.

#### Q6: Organizational Ambition (REFINE from v1 Q7 — sharper, combines trophies + identity)
**Prompt:** "What matters more — the trophy cabinet or the soul of the club?"
**Subtext:** "Every club makes this trade-off. Where do you fall?"

| Option | Label | Description | Tags boosted |
|---|---|---|---|
| A | Trophies. Period. | I want a club that wins. If they're not competing for titles, what's the point? Legacy is measured in silverware. | `trophy-driven`, `establishment`, `winning` |
| B | Identity first | I want a club with a soul — a philosophy, a culture, something that makes them unique regardless of results. Winning is secondary to being authentic. | `identity-driven`, `authentic`, `philosophical` |
| C | The smart overachiever | I want a club that does more with less — data-driven recruitment, smart scouting, finding hidden gems. Winning through intelligence, not budget. | `smart`, `overachiever`, `data-driven` |
| D | The romantic choice | I want a club that feels like a story worth telling. History, passion, a connection to a place and people. Results come and go; the romance is permanent. | `romantic`, `historic`, `community` |

**League spread audit:** A → PL, La Liga, Bundesliga, Serie A, Liga MX (big clubs in every league). B → Athletic Bilbao, Chivas, Barcelona, Arsenal, Sunderland (spans 5 leagues). C → Brighton, Atalanta, Freiburg, Lens, Pachuca (spans 5 leagues). D → Newcastle, Napoli, Marseille, Union Berlin, Club León (spans 5 leagues). ✅ No option >40% into one league.

#### Q7: NFL Team Selector (NEW — the American bridge)
**Prompt:** "Last one. Which NFL team do you root for?"
**Subtext:** "We'll match your football DNA — no soccer knowledge needed."

**Format:** A grid of all 32 NFL teams, grouped by division (AFC/NFC, North/East/South/West). User clicks one team logo/name. Each NFL team maps to 2-3 soccer clubs via intangible profile similarity.

**Display:** 32 teams in an 8×4 or 4×8 grid, organized by conference/division headers. Team name + logo (or simple text badge). Single-select, then "Stamp my passport →" button.

**Scoring:** Selecting an NFL team boosts the tag scores of its 2-3 mapped soccer clubs by a weighted amount. This is a **tiebreaker/booster question**, not a league-dictator — the other 6 questions build the primary score, and the NFL selection nudges clubs with similar intangible profiles.

**Weight:** NFL team selection contributes ~15% of total match score. Questions 1-6 contribute ~85%. This ensures NFL mapping is a meaningful nudge, not a dictatorial override.

### NFL Team → Soccer Club Mapping (all 32 teams)

This data must be embedded in `quiz.json` as `nfl_mapping`:

```json
{
  "steelers": { "clubs": ["bayern-munich", "atletico-madrid", "inter-milan"], "weight": 1.0 },
  "ravens": { "clubs": ["juventus", "atletico-madrid", "chivas"], "weight": 1.0 },
  "browns": { "clubs": ["newcastle", "torino", "atlas"], "weight": 1.0 },
  "bengals": { "clubs": ["dortmund", "napoli", "brighton"], "weight": 1.0 },
  "patriots": { "clubs": ["real-madrid", "juventus", "la-galaxy"], "weight": 1.0 },
  "bills": { "clubs": ["everton", "gladbach", "pumas"], "weight": 1.0 },
  "dolphins": { "clubs": ["marseille", "ac-milan", "monterrey"], "weight": 1.0 },
  "jets": { "clubs": ["tottenham", "inter-milan", "cruz-azul"], "weight": 1.0 },
  "colts": { "clubs": ["arsenal", "sevilla", "tigres"], "weight": 1.0 },
  "titans": { "clubs": ["athletic-bilbao", "atalanta", "puebla"], "weight": 1.0 },
  "jaguars": { "clubs": ["burnley", "eibar", "club-leon"], "weight": 0.8 },
  "texans": { "clubs": ["rb-leipzig", "psg", "lafc"], "weight": 1.0 },
  "chiefs": { "clubs": ["man-city", "barcelona", "club-america"], "weight": 1.0 },
  "raiders": { "clubs": ["marseille", "lazio", "cruz-azul"], "weight": 1.0 },
  "broncos": { "clubs": ["atletico-madrid", "dortmund", "chivas"], "weight": 1.0 },
  "chargers": { "clubs": ["inter-milan", "lyon", "tigres"], "weight": 1.0 },
  "packers": { "clubs": ["barcelona", "athletic-bilbao", "seattle-sounders"], "weight": 1.0 },
  "bears": { "clubs": ["juventus", "inter-milan", "club-america"], "weight": 1.0 },
  "lions": { "clubs": ["leicester", "napoli", "pachuca"], "weight": 1.0 },
  "vikings": { "clubs": ["tottenham", "leverkusen", "cruz-azul"], "weight": 1.0 },
  "cowboys": { "clubs": ["man-utd", "real-madrid", "club-america"], "weight": 1.0 },
  "eagles": { "clubs": ["arsenal", "napoli", "roma"], "weight": 1.0 },
  "giants": { "clubs": ["ac-milan", "inter-milan", "chivas"], "weight": 1.0 },
  "commanders": { "clubs": ["valencia", "atlas"], "weight": 0.8 },
  "saints": { "clubs": ["napoli", "marseille", "cruz-azul"], "weight": 1.0 },
  "falcons": { "clubs": ["tottenham", "leverkusen", "monterrey"], "weight": 1.0 },
  "panthers": { "clubs": ["rb-leipzig", "lille"], "weight": 0.8 },
  "buccaneers": { "clubs": ["chelsea", "inter-milan", "tigres"], "weight": 1.0 },
  "49ers": { "clubs": ["bayern-munich", "man-city", "barcelona"], "weight": 1.0 },
  "seahawks": { "clubs": ["dortmund", "seattle-sounders", "newcastle"], "weight": 1.0 },
  "rams": { "clubs": ["psg", "chelsea", "man-city"], "weight": 1.0 },
  "cardinals": { "clubs": ["eibar", "club-leon"], "weight": 0.8 }
}
```

**Note on weight:** Teams with only 2 mapped clubs (jaguars, commanders, panthers, cardinals) use weight 0.8 to reflect slightly lower mapping confidence. Teams with 3 clubs use weight 1.0. This is a directional signal, not a science — the mappings are inferred from cultural parallel-mapping (SAGE research), not from survey data.

---

## 4. Matching Algorithm Changes

### v1 approach (current)
- Each club has a `tags` object with boolean/string values
- Each quiz answer boosts specific tags
- Total tag overlap determines match score
- Q5 (geography) funnels into league-specific tags → this is the shortcut problem

### v2 approach

**Tag system overhaul:**
- Add new intangible tags to every club: `stability` (stable/chaotic/rebuilding/win-now), `fan-culture` (ultras/family/intellectual/rebel), `ambition` (trophy-driven/identity-driven/smart-overachiever/romantic), `narrative` (underdog/dynasty/cursed/project)
- Remove or deprecate geography-based tags from quiz scoring (geography tags remain on club data for display purposes, but quiz answers no longer boost them)
- Audit all 144 clubs to assign the new intangible tags

**Scoring formula (v2):**

```
For each club:
  baseScore = sum of tag matches from Q1-Q6 (weighted equally, ~14% each)
  nflBoost = 0 if no NFL team selected
           = weight × 0.15 × (1.0 if club in nfl_mapping[selectedTeam].clubs)
           = weight × 0.075 × (0.5 if club shares league with a mapped club but isn't directly mapped)
  totalScore = baseScore + nflBoost
  
Rank all clubs by totalScore, return top match + 2 runners-up
```

**Anti-shortcut audit:**
- After building the scoring matrix, run a programmatic check: for each answer option across Q1-Q6, sum the tag weight distributed to each league. If any answer funnels >40% of its weight into one league, redistribute tags until it passes.
- Include this audit as a script in `scripts/audit-scoring.js` so it can be re-run whenever tags are updated.

**Why this fixes the geography problem:**
- No quiz answer directly boosts a "France" or "Germany" tag
- Q5 (Chaos vs Stability) distributes across leagues: Bayern (stable), Juventus (stable), Marseille (chaos), Roma (chaos), Cruz Azul (chaos), Club América (win-now) — every answer touches 4+ leagues
- Q7 (NFL) boosts specific clubs, not leagues — a Steelers fan gets Bayern + Atletico + Inter (3 different leagues), not "Bundesliga clubs"
- The 40% threshold is a hard guardrail verified by the audit script

---

## 5. Share UX Spec

### Current v1 behavior
- Share button ("Copy share link") appears only on the result screen
- Clicking it copies `/?r=<base64>` to clipboard and shows the link in a share box
- Dossier and browse screens have no share button

### v2 behavior

**1. Primary share CTA on result screen (KEEP, enhance)**
- "Copy share link" button remains on the result screen, below the club match card, above the fold
- On click: copies `/?r=<base64>` to clipboard, shows a toast/notification "Link copied"
- The share link always points to the result page (`/?r=<base64>`), never to the dossier

**2. Persistent floating share bar (NEW)**
- A sticky/fixed share bar appears on every screen AFTER the user has received their result
- Visible on: result screen, dossier screen, browse screen (if user has a result)
- NOT visible on: home screen (pre-quiz), quiz screens
- The bar contains:
  - Club crest mini-icon (the matched club's crest/initials)
  - Club name + match % (e.g., "Arsenal · 92%")
  - "Share" button (copies the result link)
  - The bar is dismissible (× button) but reappears if the user navigates to another post-result screen
- **Position:** Fixed to bottom of viewport on mobile (full-width, ~56px height), bottom-right on desktop (compact pill, ~48px height)
- **Behavior:** Clicking "Share" copies the result URL to clipboard and shows a toast. The link always goes to `/?r=<base64>` — the result page, not the current screen
- **Visual style:** Passport-themed — ink/cream palette, stamp-style border, matches existing aesthetic

**3. Share targets**
- "Copy Link" (primary — always available)
- "Share to X/Twitter" (opens `https://twitter.com/intent/tweet?text=...&url=...` with pre-filled text: "I got matched to {club name} — {match}%. Take the quiz: {url}")
- Keep it simple — 2 options (copy link + X). No Instagram/Reddit native share (those platforms don't support web share intents cleanly; users will screenshot or copy-paste)

**4. Share link behavior**
- Share link (`/?r=<base64>`) loads the result page directly, same as v1
- The floating share bar should NOT appear when viewing via a shared link (the viewer hasn't taken the quiz themselves)
- Instead, show a "Take the quiz yourself →" CTA when viewing via shared link

---

## 6. Data Model Changes

### `clubs.json` — modifications to existing 144 clubs

Add the following new tag fields to every club's `tags` object:

```json
{
  "tags": {
    // EXISTING tags (keep all v1 tags for backward compat)
    "possession": true,
    "counter": false,
    "attacking": true,
    // ... all existing tags
    
    // NEW v2 tags (add to every club)
    "stability": "stable",        // stable | chaotic | rebuilding | win-now
    "fan-culture": "ultras",      // ultras | family | intellectual | rebel
    "ambition": "trophy-driven",  // trophy-driven | identity-driven | smart-overachiever | romantic
    "narrative": "dynasty"        // underdog | dynasty | cursed | project
  }
}
```

**Tag assignment:** Each club gets exactly one value per new tag dimension. This is the intangible profile that the quiz matches against. CODA must assign these values to all 144 clubs based on the club's actual identity (use the existing `identity` and `history` fields as reference).

**Tag assignment guide:**

| Tag | Values | Assignment criteria |
|---|---|---|
| `stability` | stable | Long-term sporting direction, low managerial turnover, institutional patience (Bayern, Juventus, Real Madrid) |
| | chaotic | Frequent manager changes, owner drama, transfer sagas, passionate instability (Marseille, Roma, Tottenham) |
| | rebuilding | Currently in a turnaround phase, new ownership or philosophy (Valencia, Sunderland, Commanders equivalent) |
| | win-now | Aggressive spending, short-term focus, trophy-or-bust mentality (PSG, Chelsea, Man City, Tigres) |
| `fan-culture` | ultras | Intense supporter culture, tifosi/ultras groups, politically engaged fans (Marseille, Lazio, Dortmund) |
| | family | Modern, family-friendly matchday experience (most MLS clubs, some PL clubs) |
| | intellectual | Tactical/analytical fanbase, appreciate system and philosophy (Arsenal, Barcelona, Brighton) |
| | rebel | Politically charged, anti-establishment, protest culture (Athletic Bilbao, Marseille, St. Pauli-adjacent) |
| `ambition` | trophy-driven | Club expects to win titles every year; fans demand silverware (Bayern, Real Madrid, Man City) |
| | identity-driven | Club prioritizes philosophy/culture over results; unique identity is the product (Athletic Bilbao, Chivas) |
| | smart-overachiever | Data-driven, intelligent recruitment, outperforming budget (Brighton, Atalanta, Freiburg) |
| | romantic | History, passion, connection to place; results are secondary to the romance (Newcastle, Napoli, Union Berlin) |
| `narrative` | underdog | Punching above weight, smaller club achieving beyond expectations (Brighton, Atalanta, Girona) |
| | dynasty | Historic or current dominant force; winning is expected (Bayern, Real Madrid, Club América) |
| | cursed | Long-suffering, loyal through decades of heartbreak (Newcastle pre-takeover, Tottenham, Cruz Azul) |
| | project | Building something new, young talent, ascending trajectory (RB Leipzig, LAFC, Girona) |

### `quiz.json` — restructure

```json
{
  "version": 2,
  "questions": [
    {
      "id": "q1",
      "prompt": "How do you want your club to win?",
      "subtext": "Pick the version of football that gets you off the couch.",
      "type": "standard",
      "options": [
        { "label": "Total control", "description": "Death by a thousand passes — starve the opponent of the ball until they break.", "tags": { "possession": 2, "control": 2, "tactical": 1 } },
        { "label": "The knockout blow", "description": "Sit deep, absorb pressure, then hit them on the break before they know what happened.", "tags": { "counter": 2, "defensive": 2, "pragmatic": 1 } },
        { "label": "Organized chaos", "description": "End-to-end, high-event, nobody's defense is safe. Entertainment over control.", "tags": { "attacking": 2, "open": 1, "entertainment": 1 } },
        { "label": "Grind it out", "description": "Set pieces, duels, a back line that doesn't blink. Ugly wins still count.", "tags": { "physical": 2, "defensive": 1, "set-piece": 2 } }
      ]
    },
    // Q2-Q6 follow same structure with tags from the spec above
    // ...
    {
      "id": "q7",
      "prompt": "Last one. Which NFL team do you root for?",
      "subtext": "We'll match your football DNA — no soccer knowledge needed.",
      "type": "nfl-selector",
      "options": null,
      "nfl_mapping": { ... } // The full mapping object from Section 3 above
    }
  ]
}
```

### `app.js` — key changes

1. **New question renderer for `type: "nfl-selector"`**: renders a 32-team grid instead of standard option cards
2. **Updated scoring function**: handles the new intangible tags (`stability`, `fan-culture`, `ambition`, `narrative`) and the NFL boost
3. **Floating share bar component**: new UI element rendered when `state.view` is `result`, `dossier`, or `browse` (if user has results)
4. **Share bar logic**: bar hidden when viewing via shared link (`?r=` param present AND no localStorage state)
5. **Anti-shortcut audit**: include `scripts/audit-scoring.js` that checks league distribution per answer

### `style.css` — additions

- Floating share bar styles (fixed positioning, mobile/desktop variants)
- NFL team grid styles (8×4 or 4×8 grid, team badges, hover states, selected state)
- Toast/notification styles for "Link copied" feedback

---

## 7. Non-Goals for v2

- **No new leagues** — same 7 leagues, same 144 clubs
- **No backend** — static site only
- **No user accounts** — no auth, no profile, no server-side persistence
- **No live data** — no scores, standings, fixtures
- **No per-club dynamic OG tags** — social media crawlers see the generic OG card (would need serverless functions for true per-club OG; deferred to v3 if needed)
- **No compare feature** — "compare two clubs" is a P3/future consideration
- **No community submissions** — no user-generated content
- **No native app** — stays responsive web

---

## 8. Success Metrics

### Leading indicators
- **Quiz completion rate**: target ≥85% of users who start the quiz finish it (v1 baseline unknown — add analytics event)
- **Share rate**: target ≥10% of users who complete the quiz share their result (industry baseline for viral quizzes: 2-5%; Fan Passport should exceed due to the passport stamp visual)
- **NFL question engagement**: ≥95% of users select an NFL team (if <90%, the question isn't resonating with the audience)
- **Time to complete**: target under 3 minutes (same as v1)

### Lagging indicators
- **Qualitative match satisfaction**: do beta testers feel the result is earned, not dictated? Specifically: does removing geography make results feel more surprising and more correct?
- **Anti-shortcut audit pass**: the scoring matrix must pass the 40% league-distribution check for every answer option
- **Share bar visibility**: users should be able to share from any post-result screen without navigating back

### What we're NOT measuring (v2)
- NPS, DAU/MAU, revenue — not applicable to a static portfolio project
- A/B test variants — single-variant ship, iterate on feedback

---

## 9. Phased Build Plan for CODA

### Phase 1: Data model + tag assignment (blocks everything)
1. Add `stability`, `fan-culture`, `ambition`, `narrative` tags to all 144 clubs in `clubs.json`
2. Assign values based on each club's identity, history, and culture (use existing `identity` and `history` fields as reference)
3. Restructure `quiz.json` with v2 questions (Q1-Q6 standard, Q7 NFL selector)
4. Embed `nfl_mapping` in `quiz.json`
5. Write `scripts/audit-scoring.js` to verify no answer funnels >40% into one league
6. Run the audit — fix any failures before proceeding

**Deliverable:** Updated `clubs.json` (144 clubs with new tags), `quiz.json` (v2 structure), `scripts/audit-scoring.js`

### Phase 2: Quiz UI + scoring (depends on Phase 1)
1. Build NFL team selector grid UI (32 teams, grouped by division, single-select)
2. Update the scoring function to handle new intangible tags + NFL boost
3. Update quiz rendering for Q2-Q6 with new prompts and options
4. Verify: quiz runs end-to-end, produces a result, result shows correct club + match % + why-matched tags
5. Run scoring audit: for each of the 7 questions × 4 options = 28 answer paths, verify league distribution

**Deliverable:** Updated `app.js` (quiz rendering + scoring), updated `style.css` (NFL grid)

### Phase 3: Share UX (depends on Phase 2)
1. Build floating share bar component (mobile full-width bottom, desktop bottom-right pill)
2. Show share bar on result, dossier, and browse screens (when user has results)
3. Hide share bar when viewing via shared link (`?r=` param, no localStorage state)
4. Share button copies result URL to clipboard, shows toast
5. Add "Take the quiz yourself →" CTA on shared-link views
6. Add X/Twitter share intent link

**Deliverable:** Updated `app.js` (share bar), updated `style.css` (share bar + toast)

### Phase 4: Polish + deploy (depends on Phase 3)
1. Responsive audit: 375px, 768px, 1440px — no horizontal scroll, no broken layouts
2. NFL grid responsive: 8×4 on desktop, 4×8 on mobile, touch-friendly tap targets
3. Share bar responsive: full-width bottom on mobile, bottom-right pill on desktop
4. OG meta tags: update to reflect v2 (description text may change)
5. Update README.md with v2 changes
6. Deploy to Cloudflare Pages

**Deliverable:** Deployed v2 at fan-passport-abz.pages.dev, updated README

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tag assignment is subjective — CODA may miscategorize clubs | Medium | Medium | Provide the tag assignment guide (Section 6) as reference; spot-check 10-15 clubs post-build |
| NFL mapping feels forced for some teams (e.g., Cardinals → Eibar) | Medium | Low | Weight 0.8 for low-confidence mappings; NFL is only 15% of score — won't dominate |
| 7 questions may not differentiate 144 clubs enough without geography | Low | Medium | The 4 new intangible dimensions × 4 values each = 4^4 = 256 possible intangible profiles, more than enough for 144 clubs |
| Floating share bar covers content on mobile | Low | High | Dismissible (× button), 56px height is standard for mobile bottom bars, test at 375px |
| Users skip NFL question or don't have an NFL team | Medium | Low | Allow "I don't follow the NFL" skip option → no NFL boost applied, quiz still works from Q1-Q6 |

---

## Appendix A: v1 → v2 Question Mapping

| v1 Question | v2 Question | Change |
|---|---|---|
| Q1: Playing style | Q1: Playing Philosophy | KEEP (minor tag tweaks) |
| Q2: Club identity | Q2: Fan Culture Archetype | REPLACE (sharper, scenario-framed) |
| Q3: Story appeal | Q3: Narrative Arc | REFINE (clearer options, sharper tags) |
| Q4: Rivalries | Q4: Rivalry Intensity | KEEP (minor wording tweaks) |
| Q5: Geography | Q5: Chaos vs. Stability | REPLACE (intangible, no league shortcut) |
| Q6: Access/attendance | Q6: Organizational Ambition | REPLACE (combines v1 Q7's trophies + identity) |
| Q7: Trophies vs story | Q7: NFL Team Selector | REPLACE (new — American bridge) |

## Appendix B: Tag-to-Answer Scoring Matrix

For each question, the selected answer boosts specific tag values on clubs. A club matches if its tag value equals the boosted value.

| Question | Option A boosts | Option B boosts | Option C boosts | Option D boosts |
|---|---|---|---|---|
| Q1 (Playing Philosophy) | `possession`, `control`, `tactical` | `counter`, `defensive`, `pragmatic` | `attacking`, `open`, `entertainment` | `physical`, `defensive`, `set-piece` |
| Q2 (Fan Culture) | `fan-culture: ultras` | `fan-culture: family` | `fan-culture: intellectual` | `fan-culture: rebel` |
| Q3 (Narrative Arc) | `narrative: underdog` | `narrative: dynasty` | `narrative: cursed` | `narrative: project` |
| Q4 (Rivalry Intensity) | `fierce-rivalry`, `tribal`, `passionate` | `respectful-rivalry`, `sporting` | `low-rivalry`, `neutral` | `narrative-rivalry`, `story-driven` |
| Q5 (Chaos vs Stability) | `stability: stable` | `stability: chaotic` | `stability: rebuilding` | `stability: win-now` |
| Q6 (Organizational Ambition) | `ambition: trophy-driven` | `ambition: identity-driven` | `ambition: smart-overachiever` | `ambition: romantic` |
| Q7 (NFL Team) | Club-specific boost via `nfl_mapping` | — | — | — |

---

**END OF PRD**