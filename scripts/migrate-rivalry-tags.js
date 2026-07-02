#!/usr/bin/env node
/**
 * F1 — Migrate rivalry tags from bloodfeud values.
 *
 * Q4-B sets friendlyrivalry: 2 and Q4-C sets rivalryagnostic: 2, but
 * friendlyrivalry exists on zero clubs and rivalryagnostic on only 10.
 * This migration derives both from existing bloodfeud values:
 *
 *   - Clubs with no bloodfeud tag       → set rivalryagnostic: 2
 *   - Clubs with bloodfeud: 1           → set friendlyrivalry: 2
 *   - Clubs with bloodfeud >= 2         → leave both unset
 *                                         (rivalry identity captured by bloodfeud itself)
 *
 * Idempotent: safe to re-run; overwrites friendlyrivalry/rivalryagnostic
 * according to the rule above. Clubs with bloodfeud>=2 that somehow have
 * either tag set will have them removed.
 *
 * Run: node scripts/migrate-rivalry-tags.js
 */
const fs = require('fs');
const path = require('path');

const clubsPath = path.join(__dirname, '..', 'clubs.json');
const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));

let setAgnostic = 0;
let setFriendly = 0;
let clearedHigh  = 0;

clubs.forEach(club => {
  const bf = club.tags.bloodfeud;
  const hasRivalryAgnostic = club.tags.rivalryagnostic !== undefined;
  const hasFriendlyRivalry = club.tags.friendlyrivalry !== undefined;

  if (bf === undefined) {
    // No bloodfeud → rivalryagnostic: 2
    club.tags.rivalryagnostic = 2;
    if (hasFriendlyRivalry) { delete club.tags.friendlyrivalry; clearedHigh++; }
    if (!hasRivalryAgnostic) setAgnostic++;
  } else if (bf === 1) {
    // bloodfeud: 1 → friendlyrivalry: 2
    club.tags.friendlyrivalry = 2;
    if (hasRivalryAgnostic) { delete club.tags.rivalryagnostic; clearedHigh++; }
    if (!hasFriendlyRivalry) setFriendly++;
  } else {
    // bloodfeud >= 2 → neither tag should be set
    if (hasRivalryAgnostic) { delete club.tags.rivalryagnostic; clearedHigh++; }
    if (hasFriendlyRivalry) { delete club.tags.friendlyrivalry; clearedHigh++; }
  }
});

fs.writeFileSync(clubsPath, JSON.stringify(clubs, null, 2) + '\n', 'utf8');

console.log('F1 — Rivalry tag migration complete.');
console.log(`  Clubs with no bloodfeud → rivalryagnostic:2  (newly set: ${setAgnostic})`);
console.log(`  Clubs with bloodfeud:1  → friendlyrivalry:2  (newly set: ${setFriendly})`);
console.log(`  Stale tags cleared from bloodfeud>=2 clubs:  ${clearedHigh}`);
console.log(`  Written to ${clubsPath}`);