#!/usr/bin/env node
/**
 * Phase 1: Add stability, fan-culture, ambition, narrative tags to all 144 clubs.
 * Also fixes FC Cincinnati's id from "***" to "fc-cincinnati".
 *
 * Run: node scripts/add-v2-tags.js
 */
const fs = require('fs');
const path = require('path');

const clubsPath = path.join(__dirname, '..', 'clubs.json');
const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));

// Tag assignments: [stability, fan-culture, ambition, narrative]
// Based on each club's identity, history, and culture per the PRD's assignment guide.
const TAG_MAP = {
  // ── Premier League ──
  "arsenal":            ["stable",   "intellectual", "trophy-driven",     "dynasty"],
  "liverpool":          ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "man-utd":            ["chaotic",  "intellectual", "trophy-driven",     "cursed"],
  "man-city":           ["win-now",  "intellectual", "trophy-driven",     "dynasty"],
  "chelsea":            ["win-now",  "family",       "trophy-driven",     "dynasty"],
  "tottenham":          ["chaotic",  "intellectual", "trophy-driven",     "cursed"],
  "newcastle":          ["rebuilding","ultras",      "romantic",          "project"],
  "aston-villa":        ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "west-ham":           ["chaotic",  "ultras",       "romantic",          "cursed"],
  "everton":            ["rebuilding","ultras",       "romantic",          "cursed"],
  "brighton":           ["stable",   "intellectual", "smart-overachiever","underdog"],
  "brentford":          ["stable",   "intellectual", "smart-overachiever","underdog"],
  "fulham":             ["stable",   "family",       "romantic",          "cursed"],
  "crystal-palace":     ["chaotic",  "ultras",       "romantic",          "underdog"],
  "wolves":             ["stable",   "family",       "smart-overachiever","project"],
  "nottingham-forest":  ["chaotic",  "ultras",       "romantic",          "dynasty"],
  "bournemouth":        ["stable",   "family",       "smart-overachiever","underdog"],
  "southampton":        ["rebuilding","intellectual","smart-overachiever","project"],
  "leicester":          ["stable",   "family",       "smart-overachiever","underdog"],
  "ipswich":            ["rebuilding","intellectual","smart-overachiever","underdog"],

  // ── La Liga ──
  "real-madrid":        ["stable",   "intellectual", "trophy-driven",     "dynasty"],
  "barcelona":          ["chaotic",  "intellectual", "identity-driven",   "dynasty"],
  "atletico-madrid":    ["stable",   "ultras",       "trophy-driven",     "project"],
  "athletic-bilbao":    ["stable",   "rebel",        "identity-driven",   "dynasty"],
  "real-sociedad":      ["stable",   "intellectual", "identity-driven",   "underdog"],
  "sevilla":            ["stable",   "ultras",       "smart-overachiever","dynasty"],
  "valencia":           ["rebuilding","ultras",      "trophy-driven",     "cursed"],
  "real-betis":         ["chaotic",  "ultras",       "romantic",          "cursed"],
  "villarreal":         ["stable",   "family",       "smart-overachiever","underdog"],
  "girona":             ["stable",   "intellectual", "smart-overachiever","project"],
  "mallorca":           ["stable",   "ultras",       "romantic",          "underdog"],
  "getafe":             ["stable",   "ultras",       "smart-overachiever","underdog"],
  "osasuna":            ["stable",   "ultras",       "identity-driven",   "underdog"],
  "celta-vigo":         ["chaotic",  "ultras",       "romantic",          "underdog"],
  "rayo-vallecano":     ["chaotic",  "rebel",        "identity-driven",   "underdog"],
  "las-palmas":         ["rebuilding","intellectual","identity-driven",   "underdog"],
  "alaves":             ["stable",   "family",       "smart-overachiever","underdog"],
  "leganes":            ["stable",   "family",       "smart-overachiever","underdog"],
  "espanyol":           ["stable",   "family",       "identity-driven",   "cursed"],
  "valladolid":         ["rebuilding","family",      "smart-overachiever","underdog"],

  // ── Serie A ──
  "juventus":           ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "ac-milan":           ["stable",   "intellectual", "trophy-driven",     "dynasty"],
  "inter-milan":        ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "napoli":             ["chaotic",  "ultras",       "romantic",          "cursed"],
  "as-roma":            ["chaotic",  "ultras",       "romantic",          "cursed"],
  "lazio":              ["chaotic",  "ultras",       "trophy-driven",     "dynasty"],
  "fiorentina":         ["stable",   "intellectual", "romantic",          "cursed"],
  "atalanta":           ["stable",   "intellectual", "smart-overachiever","underdog"],
  "bologna":            ["stable",   "intellectual", "smart-overachiever","dynasty"],
  "torino":             ["chaotic",  "ultras",       "romantic",          "cursed"],
  "udinese":            ["stable",   "family",       "smart-overachiever","underdog"],
  "genoa":              ["stable",   "ultras",       "romantic",          "dynasty"],
  "monza":              ["rebuilding","family",      "romantic",          "project"],
  "verona":             ["chaotic",  "ultras",       "identity-driven",   "cursed"],
  "cagliari":           ["stable",   "ultras",       "romantic",          "underdog"],
  "como":               ["rebuilding","family",      "trophy-driven",     "project"],
  "empoli":             ["stable",   "intellectual", "smart-overachiever","underdog"],
  "parma":              ["rebuilding","family",      "romantic",          "cursed"],
  "lecce":              ["stable",   "ultras",       "romantic",          "underdog"],
  "venezia":            ["rebuilding","intellectual","romantic",          "cursed"],

  // ── Bundesliga ──
  "bayern-munich":      ["stable",   "intellectual", "trophy-driven",     "dynasty"],
  "dortmund":           ["stable",   "ultras",       "identity-driven",   "underdog"],
  "leipzig":            ["stable",   "family",       "trophy-driven",     "project"],
  "leverkusen":         ["stable",   "family",       "smart-overachiever","project"],
  "schalke":            ["chaotic",  "ultras",       "romantic",          "cursed"],
  "gladbach":           ["stable",   "ultras",       "romantic",          "dynasty"],
  "eintracht-frankfurt":["chaotic",  "ultras",       "romantic",          "underdog"],
  "union-berlin":       ["stable",   "rebel",        "identity-driven",   "underdog"],
  "stuttgart":          ["chaotic",  "ultras",       "romantic",          "project"],
  "freiburg":           ["stable",   "family",       "smart-overachiever","underdog"],
  "wolfsburg":          ["stable",   "family",       "smart-overachiever","project"],
  "mainz":              ["stable",   "intellectual", "smart-overachiever","underdog"],
  "augsburg":           ["stable",   "family",       "smart-overachiever","underdog"],
  "werder-bremen":      ["chaotic",  "ultras",       "romantic",          "dynasty"],
  "hoffenheim":         ["stable",   "family",       "trophy-driven",     "project"],
  "bochum":             ["chaotic",  "ultras",       "romantic",          "underdog"],
  "heidenheim":         ["stable",   "family",       "smart-overachiever","underdog"],
  "holstein-kiel":      ["rebuilding","family",      "smart-overachiever","underdog"],

  // ── Ligue 1 ──
  "psg":                ["win-now",  "ultras",       "trophy-driven",     "dynasty"],
  "marseille":          ["chaotic",  "rebel",        "trophy-driven",     "cursed"],
  "lyon":               ["rebuilding","intellectual","trophy-driven",     "dynasty"],
  "monaco":             ["stable",   "family",       "smart-overachiever","project"],
  "lille":              ["stable",   "ultras",       "smart-overachiever","underdog"],
  "saint-etienne":      ["rebuilding","ultras",      "romantic",          "dynasty"],
  "nice":               ["stable",   "family",       "trophy-driven",     "project"],
  "rennes":             ["stable",   "ultras",       "smart-overachiever","project"],
  "strasbourg":         ["rebuilding","ultras",      "identity-driven",   "cursed"],
  "nantes":             ["chaotic",  "ultras",       "identity-driven",   "cursed"],
  "lens":               ["stable",   "ultras",       "romantic",          "underdog"],
  "brest":              ["stable",   "ultras",       "smart-overachiever","underdog"],
  "toulouse":           ["stable",   "family",       "smart-overachiever","project"],
  "montpellier":        ["stable",   "family",       "smart-overachiever","underdog"],
  "le-havre":           ["stable",   "intellectual", "smart-overachiever","underdog"],
  "auxerre":            ["stable",   "family",       "romantic",          "underdog"],
  "angers":             ["stable",   "family",       "romantic",          "underdog"],
  "reims":              ["rebuilding","intellectual","romantic",          "dynasty"],

  // ── MLS ──
  "la-galaxy":          ["stable",   "family",       "trophy-driven",     "dynasty"],
  "lafc":               ["stable",   "ultras",       "trophy-driven",     "project"],
  "inter-miami":        ["win-now",  "family",       "trophy-driven",     "project"],
  "seattle-sounders":   ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "atlanta-united":     ["stable",   "ultras",       "trophy-driven",     "project"],
  "nycfc":              ["stable",   "family",       "smart-overachiever","project"],
  "nyrb":               ["stable",   "family",       "smart-overachiever","underdog"],
  "portland-timbers":   ["stable",   "ultras",       "romantic",          "underdog"],
  "sporting-kc":        ["stable",   "family",       "smart-overachiever","underdog"],
  "fc-cincinnati":      ["stable",   "ultras",       "smart-overachiever","underdog"],
  "columbus-crew":      ["stable",   "ultras",       "smart-overachiever","project"],
  "philadelphia-union": ["stable",   "ultras",       "smart-overachiever","underdog"],
  "austin-fc":          ["stable",   "ultras",       "romantic",          "project"],
  "fc-dallas":          ["stable",   "family",       "smart-overachiever","underdog"],
  "houston-dynamo":     ["rebuilding","family",     "romantic",          "dynasty"],
  "san-jose-earthquakes":["rebuilding","family",    "romantic",          "underdog"],
  "colorado-rapids":    ["stable",   "family",       "romantic",          "underdog"],
  "real-salt-lake":     ["stable",   "family",       "smart-overachiever","underdog"],
  "minnesota-united":   ["stable",   "ultras",       "romantic",          "project"],
  "charlotte-fc":       ["win-now",  "family",       "trophy-driven",     "project"],
  "nashville-sc":       ["stable",   "ultras",       "romantic",          "project"],
  "orlando-city":       ["stable",   "ultras",       "romantic",          "project"],
  "dc-united":          ["stable",   "family",       "trophy-driven",     "dynasty"],
  "chicago-fire":       ["rebuilding","family",      "romantic",          "dynasty"],
  "new-england-revolution":["stable","family",       "smart-overachiever","underdog"],
  "toronto-fc":         ["chaotic",  "ultras",       "trophy-driven",     "cursed"],
  "vancouver-whitecaps":["stable",   "ultras",       "romantic",          "underdog"],
  "st-louis-city":      ["stable",   "ultras",       "romantic",          "project"],
  "san-diego-fc":       ["stable",   "family",       "romantic",          "project"],
  "cf-montreal":        ["rebuilding","ultras",     "romantic",          "underdog"],

  // ── Liga MX ──
  "club-america":       ["stable",   "ultras",       "trophy-driven",     "dynasty"],
  "chivas":             ["stable",   "rebel",        "identity-driven",   "dynasty"],
  "cruz-azul":          ["chaotic",  "ultras",       "trophy-driven",     "cursed"],
  "pumas":              ["stable",   "intellectual", "identity-driven",   "dynasty"],
  "tigres":             ["win-now",  "ultras",       "trophy-driven",     "project"],
  "monterrey":          ["chaotic",  "ultras",       "trophy-driven",     "project"],
  "leon":               ["stable",   "ultras",       "romantic",          "dynasty"],
  "toluca":             ["stable",   "family",       "trophy-driven",     "dynasty"],
  "pachuca":            ["stable",   "family",       "smart-overachiever","project"],
  "santos-laguna":      ["rebuilding","family",      "smart-overachiever","underdog"],
  "queretaro":          ["stable",   "family",       "romantic",          "underdog"],
  "atlas":              ["chaotic",  "ultras",       "identity-driven",   "cursed"],
  "san-luis":           ["rebuilding","family",      "romantic",          "project"],
  "puebla":             ["stable",   "ultras",       "romantic",          "dynasty"],
  "juarez":             ["rebuilding","family",      "romantic",          "project"],
  "mazatlan":           ["stable",   "family",       "romantic",          "project"],
  "tijuana":            ["chaotic",  "ultras",       "trophy-driven",     "project"],
  "necaxa":             ["stable",   "family",       "romantic",          "dynasty"],
};

// Fix FC Cincinnati id
const cinci = clubs.find(c => c.id === "***");
if (cinci) {
  cinci.id = "fc-cincinnati";
  console.log("Fixed FC Cincinnati id: *** → fc-cincinnati");
}

// Apply tags
let applied = 0;
let missing = [];
clubs.forEach(club => {
  const tags = TAG_MAP[club.id];
  if (!tags) {
    missing.push(club.id + " (" + club.name + ")");
    return;
  }
  club.tags["stability"]    = tags[0];
  club.tags["fan-culture"] = tags[1];
  club.tags["ambition"]    = tags[2];
  club.tags["narrative"]   = tags[3];
  applied++;
});

if (missing.length) {
  console.error("Missing tag assignments for " + missing.length + " clubs:");
  missing.forEach(m => console.error("  " + m));
  process.exit(1);
}

// Write back
fs.writeFileSync(clubsPath, JSON.stringify(clubs, null, 2) + "\n", "utf8");
console.log("Applied v2 tags to " + applied + " clubs. Written to " + clubsPath);