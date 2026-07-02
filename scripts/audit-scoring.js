#!/usr/bin/env node
/**
 * Anti-shortcut scoring audit.
 * For each answer option across Q1-Q6, checks that no single league
 * receives >40% of the total tag weight that answer distributes.
 *
 * Methodology:
 * - For each answer option, collect the tags it boosts (with weights).
 * - For each tag, sum the tag values across all clubs in each league.
 * - Weight each league's sum by the answer's tag weight.
 * - totalWeight = sum of all league contributions.
 * - pct[league] = leagueContribution / totalWeight × 100.
 * - Flag any league > 40%.
 *
 * For string-valued tags (stability, fan-culture, ambition, narrative):
 * - The answer specifies a value (e.g. "stability": "stable").
 * - Count clubs per league that have that value.
 * - Contribution = count × 2 (comparable to a weight-2 numeric tag).
 *
 * Run: node scripts/audit-scoring.js
 */
const fs = require('fs');
const path = require('path');

const clubsPath = path.join(__dirname, '..', 'clubs.json');
const quizPath  = path.join(__dirname, '..', 'quiz.json');

const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));
const quiz  = JSON.parse(fs.readFileSync(quizPath, 'utf8'));

const LEAGUES = ["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","MLS","Liga MX"];

// Build: tag -> { league -> sum of numeric club tag values }
const tagLeagueSums = {};
clubs.forEach(club => {
  const league = club.league;
  Object.entries(club.tags || {}).forEach(([tag, val]) => {
    if (typeof val !== 'number') return;
    if (!tagLeagueSums[tag]) tagLeagueSums[tag] = {};
    tagLeagueSums[tag][league] = (tagLeagueSums[tag][league] || 0) + val;
  });
});

// Build: stringTag -> value -> { league -> count of clubs }
const stringTagLeagueCounts = {};
clubs.forEach(club => {
  const league = club.league;
  ['stability','fan-culture','ambition','narrative'].forEach(tag => {
    const val = club.tags[tag];
    if (typeof val === 'string') {
      if (!stringTagLeagueCounts[tag]) stringTagLeagueCounts[tag] = {};
      if (!stringTagLeagueCounts[tag][val]) stringTagLeagueCounts[tag][val] = {};
      stringTagLeagueCounts[tag][val][league] = (stringTagLeagueCounts[tag][val][league] || 0) + 1;
    }
  });
});

let failures = 0;
let warnings = 0;

console.log('═'.repeat(70));
console.log('FAN PASSPORT v2 — Anti-Shortcut Scoring Audit');
console.log('═'.repeat(70));
console.log('');

quiz.questions.forEach((q, qIdx) => {
  if (q.type !== 'standard') return;

  console.log(`Q${qIdx + 1}: ${q.prompt}`);
  console.log('─'.repeat(70));

  q.options.forEach((opt, optIdx) => {
    const letter = String.fromCharCode(65 + optIdx);
    const leagueWeights = {};

    // Process numeric tags
    Object.entries(opt.tags || {}).forEach(([tag, weight]) => {
      if (typeof weight !== 'number' || weight === 0) return;
      const sums = tagLeagueSums[tag] || {};
      Object.entries(sums).forEach(([league, sum]) => {
        const contribution = sum * weight;
        leagueWeights[league] = (leagueWeights[league] || 0) + contribution;
      });
    });

    // Process string-valued tags (stability: "stable", fan-culture: "ultras", etc.)
    Object.entries(opt.tags || {}).forEach(([tag, val]) => {
      if (typeof val !== 'string') return;
      if (!stringTagLeagueCounts[tag]) return;
      const counts = stringTagLeagueCounts[tag][val] || {};
      Object.entries(counts).forEach(([league, count]) => {
        const contribution = count * 2; // weight comparable to a numeric tag with weight 2
        leagueWeights[league] = (leagueWeights[league] || 0) + contribution;
      });
    });

    // totalWeight = sum of all league contributions
    const totalWeight = Object.values(leagueWeights).reduce((a, b) => a + b, 0);

    if (totalWeight === 0) {
      console.log(`  ${letter}: ${opt.label} — ⚠️ No tag weight distributed (zero-contribution option)`);
      console.log('');
      warnings++;
      return;
    }

    // Calculate percentages
    const sorted = Object.entries(leagueWeights)
      .map(([league, w]) => ({ league, pct: (w / totalWeight) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    const maxLeague = sorted[0];
    const status = maxLeague.pct > 40 ? '❌ FAIL' : '✅ PASS';

    console.log(`  ${letter}: ${opt.label}`);
    console.log(`     Max league: ${maxLeague.league} (${maxLeague.pct.toFixed(1)}%) ${status}`);

    if (maxLeague.pct > 40) {
      failures++;
      console.log(`     ⚠️  EXCEEDS 40% THRESHOLD`);
      sorted.forEach(s => {
        console.log(`       ${s.league}: ${s.pct.toFixed(1)}%`);
      });
    }
    console.log('');
  });
  console.log('');
});

// ── NFL mapping audit ──
console.log('═'.repeat(70));
console.log('NFL MAPPING — League distribution per team');
console.log('═'.repeat(70));
console.log('');

const nflQ = quiz.questions.find(q => q.type === 'nfl-selector');
const mapping = nflQ.nfl_mapping;
let nflWarnings = 0;

Object.entries(mapping).forEach(([teamId, data]) => {
  const mappedClubs = data.clubs.map(id => clubs.find(c => c.id === id)).filter(c => c);
  if (mappedClubs.length !== data.clubs.length) {
    console.log(`  ${teamId}: ⚠️ ${data.clubs.length - mappedClubs.length} mapped club(s) not found in clubs.json`);
    nflWarnings++;
    return;
  }
  const leagueCounts = {};
  mappedClubs.forEach(c => {
    leagueCounts[c.league] = (leagueCounts[c.league] || 0) + 1;
  });
  const maxLeague = Object.entries(leagueCounts).sort((a,b) => b[1] - a[1])[0];
  const maxPct = (maxLeague[1] / mappedClubs.length) * 100;
  // NFL mapping can have >40% in one league since it's only 2-3 clubs,
  // but we warn if all 3 are from the same league
  const status = maxPct > 66 ? '⚠️ SAME LEAGUE' : '✅ spread';
  if (maxPct > 66) nflWarnings++;
  console.log(`  ${teamId} (${mappedClubs.length} clubs): ${maxLeague[0]} ${maxLeague[1]}/${mappedClubs.length} ${status}`);
});

console.log('');
console.log(`NFL mapping warnings (all clubs same league): ${nflWarnings}`);
console.log('');

// ── Summary ──
console.log('═'.repeat(70));
console.log('AUDIT SUMMARY');
console.log('═'.repeat(70));
const stdQs = quiz.questions.filter(q => q.type === 'standard');
console.log(`Questions audited: ${stdQs.length}`);
console.log(`Answer options audited: ${stdQs.reduce((sum, q) => sum + q.options.length, 0)}`);
console.log(`Failures (>40% into one league): ${failures}`);
console.log(`Warnings (zero-weight or same-league): ${warnings + nflWarnings}`);
console.log('');

if (failures > 0) {
  console.log('❌ AUDIT FAILED — Some answers concentrate >40% into one league.');
  console.log('   Redistribute tags until all answers pass.');
  process.exit(1);
} else {
  console.log('✅ AUDIT PASSED — No answer funnels >40% of weight into a single league.');
  process.exit(0);
}