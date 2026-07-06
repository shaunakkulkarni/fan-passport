# Fan Passport — Club Data Schema

Each club is a JSON object with the following required fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique slug identifier (kebab-case, e.g. `"arsenal"`) |
| `name` | string | Full club name |
| `nick` | string | Nickname(s), common shorthand |
| `league` | string | One of: `"Premier League"`, `"La Liga"`, `"Serie A"`, `"Bundesliga"`, `"Ligue 1"`, `"MLS"`, `"Liga MX"` |
| `country` | string | Home country |
| `founded` | number | Year founded |
| `stadium` | string | Stadium name + city |
| `honours` | string | Comma-separated major honours (league titles, cups, continental) |
| `c1` | string | Primary brand color (hex) |
| `c2` | string | Secondary brand color (hex) |
| `identity` | string | 1-2 sentence identity statement (what makes the club distinctive) |
| `history` | string | 3-5 sentence club history narrative |
| `rivals` | string[] | Array of rival descriptions (rival name + context) |
| `legends` | string[] | Array of legendary player/manager names |
| `watch` | string | 1-2 sentence "what to watch for" guidance for a new fan |
| `tags` | object | Tag → weight (0-3) mapping for quiz matching algorithm |
| `lastSeason` | string | 1 sentence: final league position + notable cup/continental result for the 2025–26 season. Update every season start (see `TAGGING_GUIDE.md` review triggers). |
| `keyPlayers` | string[] | 3-4 current marquee players, `"Name — one-clause reason they matter"`. Not a full roster — refresh at season start and after major transfer windows; do not attempt to track mid-window moves. |

## Tag Vocabulary

Tags are the matching dimensions used by the quiz scoring algorithm. Weights range 0-3 (0 = not applicable, 3 = core identity). All tags are optional per club — only include tags that genuinely apply.

### Playing Style
- `possession` — Total-control, possession-dominant football
- `counterattack` — Lightning counter-attacking style
- `physical` — Physical, duel-first football
- `chaos` — Chaotic, end-to-end entertainment
- `highpress` — Relentless high pressing
- `setpieces` — Set-piece discipline and threat
- `technical` — Technical, skill-first football
- `patience` — Patient, controlled build-up

### Club Culture
- `ultras` — Working-class ultras / hardcore supporter culture
- `galactico` — Galáctico-level star power and spending
- `academy` — Homegrown academy pride and production
- `underdog` — Underdog, overachiever spirit
- `community` — Community and fan-ownership values
- `rebellious` — Outsider, rule-breaking identity
- `aristocratic` — Old-money institutional weight
- `journey` — Story-worthy arc over pure trophies
- `trophyhunger` — Trophy-hunting mentality

### Geography & Fanbase
- `diaspora` — Strong diaspora and global-fan ties
- `bloodfeud` — Inherited historic rivalry intensity
- `friendlyrivalry` — Lighter, friendly rivalry
- `rivalryagnostic` — Low emphasis on rivalry
- `britain` — British football culture
- `iberia` — Iberian football culture
- `italy` — Italian football culture
- `germany` — German club culture
- `france` — French football culture
- `mexico` — Mexican football culture
- `usa` — Homegrown American soccer culture
- `accessible` — Realistic in-person attendance
- `distancefan` — Long-distance fandom appeal

## Validation Rules

1. `id` must be unique across all clubs
2. `league` must be one of the 7 valid league names
3. `founded` must be a positive integer ≤ current year
4. `c1` and `c2` must be valid hex color strings (`#RRGGBB`)
5. `rivals` must have at least one entry
6. `legends` must have at least one entry
7. `tags` must have at least 3 key-value pairs with positive values
8. All identity/history/watch fields must be non-empty strings