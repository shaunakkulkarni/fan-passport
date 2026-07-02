# Fan Passport — Tagging Guide

Era-sensitive rubric for the four intangible tag dimensions: **stability**, **fan-culture**, **ambition**, and **narrative**. This guide defines each value, its assignment criteria, and review triggers.

> Generated as part of F8. The numeric tag set (possession, ultras, bloodfeud, etc.) is out of scope here — this rubric covers only the string-valued tags that drive intangible matching and the NFL boost.

---

## How to use this guide

1. Assign the value that best fits the club's **current era** (last ~3 seasons), not its all-time historical peak.
2. When a club's situation changes materially (new manager, relegation, takeover, trophy drought breaking), re-evaluate.
3. Use the review triggers at the bottom to batch re-tagging work.

---

## stability — institutional stability profile

How much institutional chaos surrounds the club right now?

| Value | Definition | Assignment criteria |
|-------|-----------|---------------------|
| `stable` | Long-term vision, sporting director with a plan, no annual crisis. Boring excellence is fine. | Same majority ownership ≥5 years, no manager churn (≤1 change in 3 seasons), clear sporting project. |
| `chaotic` | Manager changes, owner scandals, transfer sagas. The chaos is part of the charm. | ≥2 manager changes in 3 seasons, public ownership/board drama, or recurring crisis cycles. |
| `rebuilding` | Actively fixing something — new ownership, new philosophy, a turnaround story. | New ownership/management within last 2 seasons, or clear post-crisis reset in progress. Not yet stable, no longer chaotic. |
| `win-now` | Trophies THIS year. Spend money, hire the best, deal with consequences later. | Ownership explicitly prioritizing short-term success; transfer spend well above historical club norm; veteran/peak-age recruitment. |

---

## fan-culture — fan culture archetype

What is the dominant fan experience?

| Value | Definition | Assignment criteria |
|-------|-----------|---------------------|
| `ultras` | Working-class, standing-and-singing culture. The stadium IS the experience. | Active ultras group, tifo/choreo culture, standing sections, politically charged matchday atmosphere. |
| `family` | Good view, clean concourse, kids running around. Football as a Saturday event. | Family-friendly matchday marketing, modest political engagement, broader/casual attendance base. |
| `intellectual` | There for the tactical chess match. Analyze formations, debate substitutions. | Fanbase/discourse skews tactical/analytical; club identity built around a playing philosophy more than atmosphere. |
| `rebel` | The fans who march, protest, fight ownership. Football is political. | Active fan protests against ownership, politically radical supporter culture, club identity tied to outsider/anti-establishment stance. |

---

## ambition — organizational ambition profile

What does the club prioritize — trophies or soul?

| Value | Definition | Assignment criteria |
|-------|-----------|---------------------|
| `trophy-driven` | Wins. If not competing for titles, what's the point? Legacy measured in silverware. | Club explicitly targets league/European trophies annually; transfer spend reflects title ambition. |
| `identity-driven` | A soul — a philosophy, a culture, something unique regardless of results. | Club identity prioritizes a playing philosophy, fan-ownership, or cultural mission over transfer market success. |
| `smart-overachiever` | Does more with less — data-driven recruitment, smart scouting, hidden gems. | Overperforms relative to wage/transfer budget; known for analytical recruitment and selling players on at profit. |
| `romantic` | A story worth telling. History, passion, connection to a place. Results come and go; romance is permanent. | Identity rooted in history, place, and romance more than current results or philosophy. Often long-suffering. |

---

## narrative — narrative arc

What story is the club living in right now?

| Value | Definition | Assignment criteria |
|-------|-----------|---------------------|
| `dynasty` | A club that expects to win. Every year. Pressure is the point. | Has won its domestic league within the last ~5 seasons AND operates with perennial-title expectation. Historical dynasties in a long drought should be `project` or `underdog` (see Arsenal flag below). |
| `underdog` | Punches above its weight, shocks the giants, makes you believe in miracles. | Consistently overperforms relative to resources; not a perennial title favorite but capable of upsetting. |
| `cursed` | Long-suffering, loyal through decades of heartbreak. The pain IS the identity. | Extended trophy drought (≥10 years) with repeated near-misses or tragic narrative; suffering is core to fan identity. |
| `project` | Building something new — smart recruitment, young talent, a vision taking shape. | Clear building phase: young squad, emerging philosophy, not yet at expected peak. Applies to rebuilds AND to former dynasties in a long drought trying to climb back. |

---

## Spot-check — top 25 highest-recognition clubs

| Club | stability | fan-culture | ambition | narrative | Flag? |
|------|-----------|-------------|----------|-----------|-------|
| Arsenal | stable | intellectual | trophy-driven | **dynasty** | ⚠️ **YES** — see below |
| Liverpool | stable | ultras | trophy-driven | dynasty | OK (won PL 2020, CL 2019) |
| Manchester United | chaotic | intellectual | trophy-driven | cursed | OK (drought since 2013) |
| Manchester City | win-now | intellectual | trophy-driven | dynasty | OK (perennial titles) |
| Chelsea | win-now | family | trophy-driven | dynasty | Borderline — win-now + dynasty tension, but won league 2021 |
| Tottenham | chaotic | intellectual | trophy-driven | cursed | OK (long trophy drought) |
| Real Madrid | stable | intellectual | trophy-driven | dynasty | OK |
| Barcelona | chaotic | intellectual | identity-driven | dynasty | OK |
| Atlético Madrid | stable | ultras | trophy-driven | project | OK |
| Bayern Munich | stable | intellectual | trophy-driven | dynasty | OK |
| Borussia Dortmund | stable | ultras | identity-driven | underdog | OK |
| PSG | win-now | ultras | trophy-driven | dynasty | OK |
| Juventus | stable | ultras | trophy-driven | dynasty | Borderline — won Serie A 9 straight then slipped; still title-expectation club |
| AC Milan | stable | intellectual | trophy-driven | dynasty | OK (won Serie A 2022) |
| Inter Milan | stable | ultras | trophy-driven | dynasty | OK |
| Napoli | chaotic | ultras | romantic | cursed | OK |
| Newcastle United | rebuilding | ultras | romantic | project | OK |
| Leicester City | stable | family | smart-overachiever | underdog | OK |
| LA Galaxy | stable | family | trophy-driven | dynasty | OK |
| Seattle Sounders | stable | ultras | trophy-driven | dynasty | OK |
| Club América | stable | ultras | trophy-driven | dynasty | OK |
| Chivas | stable | rebel | identity-driven | dynasty | OK |
| Cruz Azul | chaotic | ultras | trophy-driven | cursed | OK |
| Inter Miami | win-now | family | trophy-driven | project | OK |
| LAFC | stable | ultras | trophy-driven | project | OK |

---

## ⚠️ Arsenal flag — `narrative: "dynasty"` → should be `"project"`

**Current tag:** `narrative: "dynasty"`
**Problem:** Arsenal has not won the Premier League since the 2003–04 Invincibles season — a 21-year drought. The `dynasty` rubric requires a domestic league title within the last ~5 seasons AND perennial-title expectation. Arsenal meets neither criterion. They are in a genuine rebuild/building phase under Arteta with young talent and a developing philosophy — the textbook `project` profile.

**Recommended fix:** Change `narrative: "dynasty"` → `narrative: "project"` in clubs.json for arsenal.
**Alternative:** If the tagger feels Arsenal's title-contention status in 2023–24/2024–25 brings them back to expectation, `underdog` (punching back toward the top after years away) is defensible. `dynasty` is not.

**Action:** This is a documentation flag, not an automated change. A human tagger should confirm and apply. The fix is a one-line edit in clubs.json: `"narrative": "project"` under the arsenal club object.

---

## Review triggers

Re-evaluate intangible tags when any of these occur:

1. **Season start (August)** — batch review of all clubs: did stability/narrative shift over the summer? New managers, promoted/relegated clubs, ownership changes.
2. **Manager change** — mid-season or off-season: stability almost always shifts (toward `chaotic` or `rebuilding`); narrative may shift.
3. **Ownership change / takeover** — stability shifts to `rebuilding` or `win-now` depending on new owner's stated ambition.
4. **Trophy won after long drought** — narrative shifts away from `cursed` toward `dynasty` or `underdog` (depending on context). Leicester 2016 is the canonical example.
5. **Relegation** — stability → `chaotic` or `rebuilding`; narrative → `cursed` or `project`.
6. **New sporting director / philosophy** — ambition and fan-culture may shift.

**Cadence:** Full audit at every season start. Spot-check on any of the triggers above. Run `node scripts/validate-tags.js` after any tag changes to catch dead/orphaned regressions.