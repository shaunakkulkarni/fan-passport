#!/usr/bin/env node
/**
 * F7 — Remove orphaned geography tags from clubs.
 *
 * 8 tags exist on clubs but no quiz answer sets them:
 *   britain, iberia, italy, germany, france, usa, mexico, distancefan
 *
 * These are intentionally orphaned — an earlier geography question was
 * deliberately removed because it dictated league by geography. The 7 league
 * tags (britain, iberia, italy, germany, france, usa, mexico) are redundant
 * with the `league` field already on every club. distancefan is NOT wired up
 * because for US users attendance correlates almost perfectly with MLS/Liga MX,
 * which would reintroduce the league-dictation problem.
 *
 * PRECONDITION: verify browse UI reads club.league (not these tags) before
 * running. Confirmed: app.js renderBrowse() filters by c.league directly.
 *
 * Idempotent: safe to re-run; deleting a non-existent key is a no-op.
 *
 * Run: node scripts/remove-dead-geography-tags.js
 */
const fs = require('fs');
const path = require('path');

const clubsPath = path.join(__dirname, '..', 'clubs.json');
const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));

const GEO_TAGS = ['britain', 'iberia', 'italy', 'germany', 'france', 'usa', 'mexico', 'distancefan'];

let removed = 0;
const perTag = {};
GEO_TAGS.forEach(t => { perTag[t] = 0; });

clubs.forEach(club => {
  GEO_TAGS.forEach(tag => {
    if (club.tags[tag] !== undefined) {
      delete club.tags[tag];
      perTag[tag]++;
      removed++;
    }
  });
});

fs.writeFileSync(clubsPath, JSON.stringify(clubs, null, 2) + '\n', 'utf8');

console.log('F7 — Geography tag removal complete.');
console.log(`  Removed ${removed} tag assignments across ${clubs.length} clubs.`);
console.log('  Per-tag counts:');
GEO_TAGS.forEach(t => {
  console.log(`    ${t.padEnd(14)} ${perTag[t]} clubs`);
});
console.log(`  Written to ${clubsPath}`);