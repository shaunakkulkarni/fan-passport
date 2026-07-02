# Fan Passport — Tag & Matching System Deep Dive

This document explains exactly how the Fan Passport quiz matches users to soccer clubs. It covers every tag, how questions map to tags, the scoring algorithm, and structural characteristics of the data. The goal is to give a frontier LLM enough information to analyze the system for correctness, fairness, and improvement opportunities.

---

## 1. Overview

Fan Passport is a 7-question quiz that matches users to one of 144 soccer clubs across 7 leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, Liga MX). The matching system uses a **tag-based approach**: each club has a set of tags describing its playing style, culture, identity, and narrative. Each quiz answer also has tags. The algorithm scores each club by how well its tags align with the user's chosen answer tags.

There are two kinds of tags:
- **Numeric tags** — scored on a 0–3 scale (e.g., `possession: 3`, `bloodfeud: 2`). Not all clubs have every numeric tag; absence means 0.
- **String (intangible) tags** — exact-match categorical values (e.g., `stability: "stable"`, `fan-culture: "ultras"`). Every club has exactly one value for each of the 4 intangible tags.

---

## 2. The 7 Questions

### Q1 — "How do you want your club to win?" (Playing style)
Four options, each with numeric tags:

| Option | Tags |
|---|---|
| Total control | possession: 2, technical: 2, patience: 1 |
| The knockout blow | counterattack: 2, physical: 1, patience: 1 |
| Organized chaos | chaos: 2, highpress: 2, physical: 1 |
| Grind it out | physical: 2, setpieces: 2, patience: 1 |

### Q2 — "When you picture yourself at a match, what's the scene?" (Fan culture)
Four options, each with a mix of one string tag and numeric tags:

| Option | Tags |
|---|---|
| The wall of noise | fan-culture: "ultras", ultras: 2, bloodfeud: 1 |
| The family outing | fan-culture: "family", community: 1, accessible: 1 |
| The intellectual | fan-culture: "intellectual", technical: 2, possession: 1 |
| The rebels | fan-culture: "rebel", rebellious: 2, community: 1 |

### Q3 — "What kind of story do you want to be part of?" (Narrative)
Four options, each with one string tag and numeric tags:

| Option | Tags |
|---|---|
| The underdog rising | narrative: "underdog", underdog: 2, journey: 1 |
| The dynasty | narrative: "dynasty", trophyhunger: 2, galactico: 1 |
| The cursed romantic | narrative: "cursed", journey: 2, ultras: 1 |
| The project | narrative: "project", academy: 2, journey: 1 |

### Q4 — "How do you want your club to handle rivalries?" (Rivalry style)
Four options, all numeric tags:

| Option | Tags |
|---|---|
| Toxic and beautiful | bloodfeud: 3, ultras: 1, passionate: 1 |
| Respectful but real | friendlyrivalry: 2, journey: 1 |
| I don't care about rivalries | rivalryagnostic: 2, journey: 1 |
| The enemy of my enemy | bloodfeud: 1, journey: 1, underdog: 1 |

### Q5 — "What's your tolerance for institutional drama?" (Stability)
Four options, each with one string tag and numeric tags:

| Option | Tags |
|---|---|
| Rock solid | stability: "stable", patience: 2 |
| Beautiful chaos | stability: "chaotic", chaos: 2, passionate: 1 |
| Rebuild in progress | stability: "rebuilding", journey: 2, underdog: 1 |
| Win now, figure it out later | stability: "win-now", trophyhunger: 2, galactico: 1 |

### Q6 — "What matters more — the trophy cabinet or the soul of the club?" (Ambition)
Four options, each with one string tag and numeric tags:

| Option | Tags |
|---|---|
| Trophies. Period. | ambition: "trophy-driven", trophyhunger: 2, galactico: 1 |
| Identity first | ambition: "identity-driven", rebellious: 1, community: 2 |
| The smart overachiever | ambition: "smart-overachiever", academy: 2, underdog: 1 |
| The romantic choice | ambition: "romantic", journey: 2, ultras: 1 |

### Q7 — "Which NFL team do you root for?" (NFL bridge)
This is a special question. The user picks one of 32 NFL teams (or skips). Each NFL team is mapped to 4 string-tag values (stability, fan-culture, ambition, narrative). When scored, the NFL boost works differently from Q1–Q6 — it's a 15% bonus applied proportionally to clubs whose string tags match the NFL team's profile.

NFL mapping is fully defined in `quiz.json`. Every NFL team maps to exactly 4 string tags plus a weight (0.8 or 1.0). The boost is split equally across the 4 dimensions: each matching dimension contributes `(weight * 0.15 / 4) * maxBaseScore`.

---

## 3. The Tag System

### 33 Total Tags

Every club has a `tags` object. Some tags are numeric (0–3 scale), some are string (categorical). Here is the complete list:

**Numeric tags (22 tags):**
These represent playing style, culture, and identity dimensions. Clubs that don't have a particular tag effectively have 0. Values range from 1–3.

| Tag | Description | # Clubs with it | Min | Max | Avg |
|---|---|---|---|---|---|
| possession | High-possession, ball-retention style | 17 | 1 | 3 | 2.2 |
| counterattack | Counter-attacking, sit-and-hit style | 11 | 2 | 3 | 2.1 |
| physical | Physical, duel-first football | 14 | 1 | 3 | 1.9 |
| chaos | Chaotic, end-to-end football | 3 | 1 | 1 | 1.0 |
| highpress | Relentless high pressing | 12 | 1 | 3 | 2.4 |
| setpieces | Set-piece discipline | 9 | 1 | 3 | 1.8 |
| technical | Technical, academy-built football | 38 | 1 | 3 | 2.0 |
| patience | Patient, controlled football | 11 | 2 | 3 | 2.2 |
| ultras | Working-class ultras culture | 25 | 2 | 3 | 2.6 |
| galactico | Galáctico-level star power | 11 | 1 | 3 | 2.2 |
| academy | Homegrown academy pride | 26 | 1 | 3 | 2.5 |
| underdog | Underdog, overachiever spirit | 94 | 1 | 3 | 2.3 |
| community | Community and fan-ownership values | 85 | 1 | 3 | 1.9 |
| rebellious | Outsider, rule-breaking pride | 10 | 1 | 3 | 1.6 |
| aristocratic | Old-money institutional weight | 13 | 1 | 3 | 1.5 |
| journey | A story worth telling over pure trophies | 115 | 1 | 3 | 2.3 |
| trophyhunger | A genuine trophy-hunting mentality | 24 | 1 | 3 | 2.2 |
| diaspora | Diaspora ties | 10 | 1 | 2 | 1.7 |
| bloodfeud | Inherited, historic rivalry | 71 | 1 | 3 | 2.2 |
| friendlyrivalry | Lighter, friendlier rivalry | (exists in quiz only) | — | — | — |
| rivalryagnostic | Low emphasis on rivalry | (exists in quiz only) | — | — | — |
| accessible | Realistic in-person attendance | 54 | 1 | 3 | 2.0 |
| distancefan | Long-distance fandom | 144 | 0 | 3 | 1.2 |
| passionate | Passionate, emotional intensity | (exists in quiz only) | — | — | — |

**String (intangible) tags (4 tags):**
Every club has exactly one value for each. These are the categorical identity dimensions.

| Tag | Possible Values | Distribution |
|---|---|---|
| stability | stable, chaotic, win-now, rebuilding | stable: 89, chaotic: 26, rebuilding: 23, win-now: 6 |
| fan-culture | ultras, family, intellectual, rebel | ultras: 63, family: 51, intellectual: 25, rebel: 5 |
| ambition | trophy-driven, romantic, smart-overachiever, identity-driven | romantic: 50, smart-overachiever: 43, trophy-driven: 36, identity-driven: 15 |
| narrative | dynasty, underdog, project, cursed | underdog: 52, dynasty: 35, project: 35, cursed: 22 |

**League tags (7 tags):**
These are binary (present or absent) and indicate which league the club belongs to.

| Tag | # Clubs |
|---|---|
| britain | 20 (Premier League) |
| iberia | 20 (La Liga) |
| italy | 20 (Serie A) |
| germany | 18 (Bundesliga) |
| france | 18 (Ligue 1) |
| usa | 30 (MLS) |
| mexico | 18 (Liga MX) |

---

## 4. The Scoring Algorithm

The algorithm runs in `computeResults(answers)` in `app.js`. Here's exactly what it does, step by step:

### Step 1 — Build numeric profile from Q1–Q6
For each answer in Q1–Q6, iterate over the answer's tags. If a tag value is a **number**, accumulate it into `profile[tag]`. For example, answering "Total control" for Q1 adds: `{possession: 2, technical: 2, patience: 1}`.

After Q1–Q6, `profile` is a map like: `{possession: 2, technical: 4, patience: 3, ultras: 2, bloodfeud: 4, ...}`

### Step 2 — Build intangible profile from Q2, Q3, Q5, Q6
For each answer in Q1–Q6, iterate over the answer's tags. If a tag value is a **string**, store it in `intangibleProfile[tag]`. For example, answering "The wall of noise" for Q2 sets: `{fan-culture: "ultras"}`.

After Q1–Q6, `intangibleProfile` is a map like: `{fan-culture: "ultras", narrative: "underdog", stability: "chaotic", ambition: "romantic"}`

### Step 3 — Score each club
For each of the 144 clubs:

**Numeric scoring:** For each tag in `profile`, look up the club's tag value. If both are numbers and both are > 0, the contribution is `profile[tag] * club.tags[tag]`. For example, if the user accumulated `possession: 2` and Arsenal has `possession: 3`, the contribution is `2 * 3 = 6`.

**Intangible scoring:** For each tag in `intangibleProfile`, check if the club's tag value exactly matches. If so, add **3 points**. For example, if the user's `fan-culture` is `"ultras"` and the club's `fan-culture` is `"ultras"`, add 3.

The club's raw `score` is the sum of all numeric contributions + all intangible matches (each worth 3).

### Step 4 — Normalize and apply NFL boost
1. Sort clubs by raw score descending. `maxBaseScore` = the top club's raw score.
2. If the user selected an NFL team (Q7), look up its 4 string tags from the NFL mapping.
3. For each club, for each of the 4 NFL tag dimensions, if the club's string tag matches the NFL team's tag, add: `(weight * 0.15 / 4) * maxBaseScore`.
4. A club matching all 4 NFL dimensions gets a 15% boost. A club matching 2 of 4 gets 7.5%.
5. Re-sort after boost.

### Step 5 — Return top 3
Take the top 3 clubs. The match percentage is `(clubScore / topScore) * 100`, rounded. The top 5 contributing tags are listed as "why you matched."

---

## 5. Structural Properties & Potential Issues

### Numeric tag sparsity
Most numeric tags only appear on a small subset of clubs. For example:
- `chaos`: only 3 clubs (out of 144)
- `possession`: only 17 clubs
- `patience`: only 11 clubs

This means if a user answers "Organized chaos" (chaos: 2, highpress: 2, physical: 1), they're essentially only scoring against ~12 clubs that have `highpress`, ~3 with `chaos`, and ~14 with `physical`. The remaining 130+ clubs get 0 from that answer. This creates sharp differentiation but also means many clubs are effectively unreachable for certain answer combinations.

### Numeric tag overlap
Many clubs have the same broad tags. `underdog` appears on 94 of 144 clubs. `journey` on 115. `community` on 85. `distancefan` on all 144. These tags contribute to many clubs equally and don't differentiate well. The differentiation comes from the rarer tags (`possession`, `chaos`, `galactico`, `rebellious`) and the 4 intangible string tags.

### Intangible tag dominance
Each intangible string-tag match is worth a flat 3 points. But numeric tag contributions are products of two numbers (answer weight × club weight), typically ranging from 1×1=1 to 3×3=9. So intangible matches (3 each) are competitive with numeric matches but not dominant. However, a user can accumulate 4 intangible matches (one per tag) for 12 points from string tags alone, which is significant.

### NFL boost mechanics
The NFL boost is normalized against `maxBaseScore` (the top club's raw score before NFL). This means:
- If `maxBaseScore` is high (many strong matches), the NFL boost is proportionally smaller in absolute terms.
- If `maxBaseScore` is low (few clubs match well), the NFL boost is proportionally larger.
- A club matching all 4 NFL dimensions gets `(weight * 0.15) * maxBaseScore` added. If the top club's raw score is, say, 30, that's a 4.5-point boost — meaningful but not overwhelming.

### Distancefan universality
`distancefan` is on all 144 clubs with values 0–3. This tag is never set by any quiz answer (no answer references it), so it's inert — it exists in the data but doesn't affect scoring. Same with the league tags (`britain`, `iberia`, `italy`, `germany`, `france`, `usa`, `mexico`) — no quiz answer references them.

### Tags only set by quiz answers (not in clubs)
Three tags appear in quiz answer options but are not present on any club: `friendlyrivalry`, `rivalryagnostic`, `passionate`. These are effectively dead — they can never match a club tag. Answering "Respectful but real" (Q4) gives `friendlyrivalry: 2, journey: 1` — only `journey` contributes to scoring. Answering "I don't care about rivalries" gives `rivalryagnostic: 2, journey: 1` — again only `journey`. This means Q4 options B and C are weaker than A and D (which have `bloodfeud`).

### Possible scoring imbalances
- Q4 option A ("Toxic and beautiful") gives `bloodfeud: 3, ultras: 1, passionate: 1` — but `passionate` is dead, so effectively `bloodfeud: 3 + ultras: 1`. 
- Q4 option B ("Respectful but real") gives `friendlyrivalry: 2, journey: 1` — `friendlyrivalry` is dead, so effectively only `journey: 1`. This option contributes much less than A.
- Q4 option C ("I don't care about rivalries") gives `rivalryagnostic: 2, journey: 1` — `rivalryagnostic` is dead, so effectively only `journey: 1`. Same problem.

### Clubs without certain tags
Clubs that don't have a numeric tag simply get 0 from it. This is intentional — not every club is known for pressing, or for academy production, etc. But it means some clubs have very few active tags, making them harder to match to (they rely more on intangible tags and the few numeric tags they do have).

### Potential duplicate/conflicting signals
Several quiz answers reference the same underlying concept through different tags:
- Q1 "Organized chaos" sets `chaos: 2` (numeric). Q5 "Beautiful chaos" sets `stability: "chaotic"` (string) + `chaos: 2` (numeric). These reinforce each other — a chaos-loving user gets both the numeric and string match. This is intentional.
- Q2 "The wall of noise" sets `ultras: 2` (numeric). Q6 "The romantic choice" sets `ultras: 1` (numeric). These can stack.
- Q3 "The cursed romantic" sets `ultras: 1`. So a user who picks "ultras" answers for Q2, Q3, and Q6 could stack `ultras` to 5.

### Percentage calculation
The match percentage is relative to the top score, not absolute. A 100% match doesn't mean a perfect match — it means the club scored highest. A 90% match means the 3rd-place club scored 90% as high as 1st. This can make results look more decisive than they are.

---

## 6. Club Data Structure

Each club in `clubs.json` has:
```json
{
  "id": "arsenal",
  "name": "Arsenal",
  "nick": "The Gunners",
  "league": "Premier League",
  "country": "England",
  "founded": 1886,
  "stadium": "Emirates Stadium, London",
  "honours": "13 English league titles, 14 FA Cups",
  "c1": "#EF0107",
  "c2": "#023474",
  "identity": "High-possession, academy-proud, and self-consciously intellectual...",
  "history": "Founded by munitions workers in Woolwich in 1886...",
  "rivals": ["Tottenham Hotspur — ...", "Manchester United — ..."],
  "legends": ["Thierry Henry", "Tony Adams", ...],
  "watch": "A squad built almost entirely through patient recruitment...",
  "tags": {
    "possession": 3, "academy": 3, "technical": 2,
    "bloodfeud": 3, "britain": 3, "trophyhunger": 2,
    "journey": 2, "accessible": 1, "distancefan": 3,
    "stability": "stable", "fan-culture": "intellectual",
    "ambition": "trophy-driven", "narrative": "dynasty"
  }
}
```

The `c1` and `c2` fields are hex colors for the club's visual identity. The `identity`, `history`, `watch`, `rivals`, and `legends` fields are descriptive text used on dossier pages — they are NOT used in the matching algorithm. Only the `tags` object is used for scoring.

---

## 7. What an LLM Could Analyze

When reviewing this system, the following questions are worth investigating:

1. **Tag coverage gaps** — Are there clubs that are hard to reach because they lack distinctive numeric tags? Are there answer combinations that produce flat/uniform scores across many clubs?

2. **Dead tags** — `friendlyrivalry`, `rivalryagnostic`, `passionate`, `distancefan`, and all 7 league tags are never matched by any quiz answer. Should they be removed, or should quiz answers be added that reference them?

3. **Intangible tag balance** — `stability: "stable"` covers 89 clubs (62%). Is that too broad? Should there be finer granularity? Similarly, `ambition: "romantic"` covers 50 clubs (35%) — is that too many for a single match?

4. **Numeric tag imbalance** — `underdog` appears on 94 clubs and `journey` on 115. These are very common and contribute to many clubs equally. Do they dilute the signal from rarer tags?

5. **Q4 scoring asymmetry** — Options B and C effectively contribute only `journey: 1` because their primary tags (`friendlyrivalry`, `rivalryagnostic`) are dead. Is this intentional or a bug?

6. **NFL boost calibration** — 15% boost across 4 dimensions. Is this the right weight? Should it be lower (since it's a single question) or higher (since it's the user's existing sports identity)?

7. **Percentage display** — Top result is always 100% (it's relative). Should the UI show absolute scores or confidence levels instead?

8. **Tag redundancy** — Several answers set the same tags (e.g., `ultras` appears in Q2, Q3, and Q6 answers; `journey` appears in Q3, Q4, Q5, Q6). Does this create over-weighting of certain dimensions?

9. **Club tag accuracy** — Are the 144 clubs tagged correctly? Are there clubs that should have different intangible values? (This is a content/editorial question, not a code question.)

10. **Question ordering effects** — Does the order of questions matter? (It shouldn't for scoring, since all answers are collected before scoring runs, but worth confirming.)

---

## 8. Files

- `quiz.json` — All 7 questions, their options, tag weights, NFL mapping (285 lines)
- `clubs.json` — All 144 clubs with tags (5,183 lines)
- `app.js` — Scoring algorithm in `computeResults()` (933 lines total, algorithm at lines ~182–280)
- `style.css` — Visual styling (443 lines)
