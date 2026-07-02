# PRD: Fan Passport — Club Matchmaking & Dossier Site

**Status:** Draft for build handoff
**Owner:** Shaunak
**Version:** v1 (baseline prototype exists — see "Current State" below)

---

## Problem Statement

The 2026 World Cup created a wave of new US soccer fans who don't yet have a club to follow once domestic and European leagues resume — Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, and Liga MX all restart within weeks of each other. These fans have no easy way to figure out which of ~100+ clubs across seven leagues actually fits their taste, and most "which club should you support" content online is either a shallow BuzzFeed-style quiz or a wall of Wikipedia-grade text with no matching logic behind it. Without a low-friction, credible on-ramp, most of this new fan attention dissipates once the tournament ends instead of converting into ongoing league viewership.

## Goals

1. Match a first-time fan to a club they'd genuinely enjoy following, using a multi-dimensional quiz (style, culture, rivalry appetite, geography, World Cup affinity) rather than a single surface-level question.
2. Give every matched fan enough real club history and context (dossier) that they can watch a match or talk about the club without feeling like a fraud in week one.
3. Make the experience feel considered and editorial, not templated — this is as much a piece of content/design as it is a tool.
4. Support casual, repeat use: someone should be able to retake the quiz, browse without the quiz, and jump straight to a specific club.
5. Ship something a single person can maintain and extend without a team — no infrastructure that outpaces the actual usage.

## Non-Goals (v1)

- **User accounts / login** — no reason to gate this behind auth for a quiz-and-browse experience. Revisit only if persistence requires it.
- **Live scores, standings, or fixture data** — this is an onboarding/identity tool, not a live-data product. Pulling in real-time sports data is a separate, much larger integration.
- **Exhaustive club coverage** — v1 intentionally curates ~8-10 identity-rich clubs per league rather than every club in every league. Full-league coverage is a P2/future consideration.
- **Native mobile app** — stays a responsive website. No app-store distribution in this phase.
- **Monetization (ads, affiliate links, merch)** — out of scope until the core experience is validated.

## Current State (baseline to build from)

A working single-file HTML/CSS/JS prototype already exists (no build step, no backend, no persistence):
- 58 clubs across 7 leagues, each with identity/history/rivals/legends/honours/what-to-watch fields and a tag object used for matching.
- A 7-question quiz with weighted tag scoring that returns a top match + 2 runners-up with a "why matched" explanation (top overlapping tags).
- Full dossier pages per club, a league-grouped browse/directory view, and a "Fan Passport" visual concept (stamps, passport-page framing, league-accent colors).
- All state is in-memory JS (`state` object) with no persistence — a page refresh loses quiz progress and results.

This PRD scopes the next build phase on top of that baseline. The coding agent should treat the existing file as the v0 implementation to refactor/extend, not a spec to reverse-engineer from scratch.

---

## User Stories

**New fan (primary persona)**
- As a new fan, I want to answer a short quiz so that I get matched to a club without having to already know anything about soccer.
- As a new fan, I want to understand *why* I was matched so that the result feels earned, not random.
- As a new fan, I want to read a real dossier on my matched club so that I have enough context to follow along on day one.
- As a new fan, I want the quiz and result to look good on my phone, since that's most likely where I'll take it.

**Browsing / undecided fan**
- As a fan who doesn't want to take a quiz, I want to browse all clubs by league so that I can explore on my own terms.
- As a fan comparing options, I want to see my top match's runners-up so that I have alternatives if the #1 pick doesn't click.

**Repeat / sharing fan**
- As a fan who got a fun result, I want to share it (link, image, or text) so that I can show friends without them having to retake the quiz themselves.
- As a returning fan, I want to retake the quiz and get a consistent, explainable result so that I trust the matching logic isn't random each time.

**Maintainer (Shaunak / coding agent)**
- As the maintainer, I want club data structured consistently (JSON schema) so that adding a new club or league doesn't require touching quiz logic.
- As the maintainer, I want the matching algorithm's tag weights documented so that I can tune it without guessing why a result changed.

---

## Requirements

### Must-Have (P0)

**Data depth expansion**
- Expand from 58 to fuller league coverage — target at minimum: Premier League, La Liga, Serie A, Bundesliga (all ~18-20 clubs each), Ligue 1 (~18), MLS (~30 across current club count), Liga MX (~18).
- Every club must retain the full existing field set (identity, history, rivals, legends, honours, stadium, what-to-watch, tags) — no shortcuts to thinner club entries as coverage grows.
- Extract club data into a standalone JSON/data file separate from application logic (currently inline in the HTML `<script>`), so data growth doesn't require editing app code.
- Acceptance: every club in every listed league's top division has a dossier entry; data file validates against a documented schema (no missing required fields).

**Persistence & sharing**
- Quiz results and progress should survive a page refresh (at minimum: local persistence; a shareable link is P0, a fully synced backend is a stack decision — see Technical Considerations).
- A matched result must be shareable via a unique URL that reconstructs the same result (club + match % + why-matched tags) without the recipient retaking the quiz.
- Acceptance: given a completed quiz, when the user copies/shares the result link, then opening that link in a new session shows the same club, match %, and explanation.

**Responsive/visual polish**
- All views (home, quiz, result, dossier, browse) must be fully usable at mobile widths (375px baseline) with no horizontal scroll, no truncated tap targets, and readable type at every breakpoint.
- Preserve the existing "Fan Passport" visual identity (stamps, passport-page framing, ink/paper/pitch palette) — polish means refining execution, not replacing the concept.
- Acceptance: manual QA pass at 375px, 768px, and 1440px widths with no layout breaks; Lighthouse mobile usability score ≥ 90.

### Should-Have (P1)

- Loading/empty states for any data-fetching (relevant once data moves to a file or API rather than inline).
- Basic analytics on which questions/answers correlate with which outcomes (to sanity-check the matching algorithm over time) — self-hosted or privacy-respecting, not a full analytics suite.
- A lightweight "retake with different answers" flow that doesn't require navigating back through all 7 questions from question 1 if the user just wants to change one answer.
- Social share card (Open Graph image) so shared result links render a club-branded preview in iMessage/Slack/Twitter instead of a bare link.

### Future Considerations (P2)

- Full exhaustive league coverage (every club in every division, not just identity-rich picks).
- Additional leagues (Liga Portugal, Eredivisie, Brasileirão) if usage justifies it.
- A "compare two clubs" view.
- Community-submitted dossier corrections/suggestions.
- Native app wrapper if usage patterns show strong repeat mobile engagement.

---

## Technical Considerations (stack decision)

The current build is a static, dependency-free single HTML file. Persistence and shareable links are the forcing function for a stack decision — a coding agent should choose based on these criteria rather than defaulting to either extreme:

- **Stay static (client-side only)** if shareable links can be encoded entirely in the URL (e.g., base64-encoded quiz answers in a query param, re-computed client-side on load) — this avoids a backend entirely and keeps hosting trivial (GitHub Pages, Netlify, Vercel static).
- **Add a lightweight backend** only if: (a) URL-encoded state becomes unwieldy or fragile, (b) analytics (P1) requires server-side aggregation, or (c) future features (P2 community submissions) require a real datastore. If so, prefer the smallest viable option (e.g., a serverless function + key-value store) over a full server + database.
- Either way: keep club data in a structured file (JSON) that can be statically imported at build time, not hand-maintained inside application code.

**Open question (engineering):** confirm hosting target before deciding backend complexity — a personal static host vs. something with serverless function support changes which persistence approach is cheapest to build and maintain.

---

## Success Metrics

This is a personal/portfolio project, not a funded product, so metrics should stay lightweight and mostly self-assessed rather than requiring dashboards:

**Leading indicators**
- Quiz completion rate (started vs. finished) — target: most people who start finish (no hard drop-off point in the 7 questions).
- Time to complete quiz — target: under 3 minutes.
- % of results shared (if share feature ships) — directional signal only, no hard target for v1.

**Lagging indicators**
- Qualitative: does the matched result feel right to people who try it? (informal feedback from friends/testers is sufficient for v1 — no formal NPS needed.)
- Whether club data stays accurate season-over-season (a maintenance signal, not a usage one).

---

## Open Questions

- **(Engineering)** Where will this be hosted long-term? Determines the static-vs-backend call above.
- **(Design)** Does the Open Graph share card need custom per-club artwork, or can it be templated from existing crest colors/initials already in the data?
- **(Product/Shaunak)** Is there an appetite to keep expanding leagues (Liga Portugal, Eredivisie, Brasileirão) post-v1, or is the current 7-league scope the long-term ceiling?
- **(Engineering)** Should quiz-answer analytics (P1) be built now while the schema is small, or deferred until there's a hosting/backend decision anyway?

---

## Timeline Considerations

- No hard external deadline, but there's a soft window: MLS is mid-season and European leagues + Liga MX restart in the coming weeks, so shipping the P0 scope before major kickoffs maximizes relevance.
- Suggested phasing:
  1. **Phase 1:** Extract data to a standalone schema-validated file + expand league coverage (P0 data work) — unblocks everything else.
  2. **Phase 2:** Responsive/visual polish pass (P0) — can happen in parallel with Phase 1 since it touches CSS/layout, not data.
  3. **Phase 3:** Persistence + shareable links (P0) — depends on the stack decision above; sequence after Phase 1 so shared links reflect the fuller dataset.
  4. **Phase 4:** P1 items (share cards, analytics, quick-edit retake flow) as fast-follows once Phases 1-3 are stable.
