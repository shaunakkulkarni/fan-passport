#!/usr/bin/env node
/**
 * Club reachability audit.
 *
 * The anti-shortcut audit (audit-scoring.js) checks that no single answer
 * funnels weight into one league. It does NOT check whether the resulting
 * scoring produces a wide spread of possible top matches across all 144
 * clubs — a club can pass every per-answer check and still be mathematically
 * unable to ever win, if its tag profile is dominated by every plausible
 * competitor.
 *
 * This script brute-forces every combination of Q1-Q6 answers (4^6 = 4096)
 * crossed with every Q7 NFL option (32 teams + skip = 33), re-implements
 * computeResults() from app.js, and reports which clubs ever place #1.
 *
 * Run: node scripts/audit-reachability.js
 */
const fs = require('fs');
const path = require('path');

const clubs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'clubs.json'), 'utf8'));
const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

const standardQs = quiz.questions.filter(q => q.type === 'standard');
const nflQ = quiz.questions.find(q => q.type === 'nfl-selector');
const nflOptions = [...nflQ.nfl_teams.map(t => t.id), null]; // null = skipped

// ── Mirrors buildIdfTables() + computeResults() in app.js ──
const N = clubs.length;
const numericIdf = {}, stringIdf = {};
const numDf = {}, strDf = {};
clubs.forEach(club => {
  Object.entries(club.tags || {}).forEach(([tag, val]) => {
    if (typeof val === 'number') numDf[tag] = (numDf[tag] || 0) + 1;
    else if (typeof val === 'string') { if (!strDf[tag]) strDf[tag] = {}; strDf[tag][val] = (strDf[tag][val] || 0) + 1; }
  });
});
Object.entries(numDf).forEach(([tag, df]) => numericIdf[tag] = Math.log(N / df));
Object.entries(strDf).forEach(([tag, vals]) => { stringIdf[tag] = {}; Object.entries(vals).forEach(([v, df]) => stringIdf[tag][v] = Math.log(N / df)); });

function topClub(answerIdxs, nflTeamId) {
  const profile = {}, intangibleProfile = {};
  answerIdxs.forEach((optIdx, i) => {
    const opt = standardQs[i].options[optIdx];
    Object.entries(opt.tags || {}).forEach(([tag, val]) => {
      if (typeof val === 'number' && val !== 0) profile[tag] = (profile[tag] || 0) + val;
      else if (typeof val === 'string') intangibleProfile[tag] = val;
    });
  });

  const scored = clubs.map(club => {
    let score = 0;
    const contributions = [];
    Object.entries(profile).forEach(([tag, val]) => {
      const clubVal = club.tags[tag];
      if (typeof clubVal !== 'number') return;
      const contrib = val * clubVal * (numericIdf[tag] || 0);
      if (contrib > 0) contributions.push({ tag, contrib });
      score += contrib;
    });
    Object.entries(intangibleProfile).forEach(([tag, val]) => {
      const clubVal = club.tags[tag];
      if (typeof clubVal === 'string' && clubVal === val) {
        const contrib = 3 * ((stringIdf[tag] && stringIdf[tag][val]) || 0);
        if (contrib > 0) contributions.push({ tag, contrib });
        score += contrib;
      }
    });
    if (score > 0 && contributions.length > 1) {
      const cap = 0.40 * score;
      let excess = 0;
      contributions.forEach(c => { if (c.contrib > cap) { excess += (c.contrib - cap); c.contrib = cap; } });
      if (excess > 0) score = contributions.reduce((s, c) => s + c.contrib, 0);
    }
    return { club, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const maxBaseScore = scored[0].score || 1;

  if (nflTeamId && nflQ.nfl_mapping[nflTeamId]) {
    const mapping = nflQ.nfl_mapping[nflTeamId];
    const weight = mapping.weight || 1.0;
    const perDimBoost = (weight * 0.15) / 4;
    scored.forEach(s => {
      let boost = 0;
      Object.entries(mapping.tags || {}).forEach(([dim, val]) => { if (s.club.tags[dim] === val) boost += perDimBoost * maxBaseScore; });
      s.score += boost;
    });
    scored.sort((a, b) => b.score - a.score);
  }
  return scored[0].club;
}

// ── Brute force all combos ──
const winners = {};
let total = 0;
for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++)
  for (let d = 0; d < 4; d++) for (let e = 0; e < 4; e++) for (let f = 0; f < 4; f++)
    for (const nfl of nflOptions) {
      const w = topClub([a, b, c, d, e, f], nfl);
      winners[w.id] = (winners[w.id] || 0) + 1;
      total++;
    }

const sorted = Object.entries(winners).sort((x, y) => y[1] - x[1]);
const neverWin = clubs.filter(c => !winners[c.id]);
const top5Share = sorted.slice(0, 5).reduce((s, [, n]) => s + n, 0) / total;

const leagueWins = {};
const leagueCounts = {};
clubs.forEach(c => leagueCounts[c.league] = (leagueCounts[c.league] || 0) + 1);
sorted.forEach(([id, n]) => { const c = clubs.find(x => x.id === id); leagueWins[c.league] = (leagueWins[c.league] || 0) + n; });

console.log('═'.repeat(70));
console.log('FAN PASSPORT — Club Reachability Audit');
console.log('═'.repeat(70));
console.log('');
console.log(`Combos simulated: ${total} (4^6 Q1-Q6 answers × 33 Q7 NFL options)`);
console.log(`Unique clubs that ever place #1: ${sorted.length} / ${clubs.length}`);
console.log(`Top-5 concentration: ${(top5Share * 100).toFixed(1)}% of all combos land on just 5 clubs`);
console.log('');
console.log('Wins by league (share of combos vs. share of club roster):');
Object.keys(leagueCounts).sort((a, b) => (leagueWins[b] || 0) - (leagueWins[a] || 0)).forEach(league => {
  const winPct = ((leagueWins[league] || 0) / total * 100).toFixed(1);
  const rosterPct = (leagueCounts[league] / clubs.length * 100).toFixed(1);
  console.log(`  ${league.padEnd(16)} wins: ${winPct.padStart(5)}%   roster share: ${rosterPct.padStart(5)}%`);
});
console.log('');

if (neverWin.length > 0) {
  console.log(`⚠️  ${neverWin.length} clubs NEVER place #1 across all ${total} combos:`);
  console.log('   ' + neverWin.map(c => c.name).join(', '));
} else {
  console.log('✅ Every club places #1 in at least one combo.');
}
console.log('');

// Thresholds are informational, not hard failures — reachability gaps are a
// content/tagging issue to investigate, not necessarily a bug to block on.
const WARN_NEVER_WIN_PCT = 0.35; // warn if >35% of clubs are unreachable
const WARN_TOP5_SHARE = 0.40;    // warn if top 5 clubs eat >40% of outcomes

let warnings = 0;
if (neverWin.length / clubs.length > WARN_NEVER_WIN_PCT) {
  console.log(`⚠️  ${(neverWin.length / clubs.length * 100).toFixed(0)}% of clubs are unreachable — consider a tagging pass to diversify weaker leagues.`);
  warnings++;
}
if (top5Share > WARN_TOP5_SHARE) {
  console.log(`⚠️  Top 5 clubs account for ${(top5Share * 100).toFixed(0)}% of all outcomes — results may feel repetitive/unpersonalized.`);
  warnings++;
}

console.log('');
console.log('═'.repeat(70));
console.log(`SUMMARY: ${warnings} warning(s). Run after any tag/quiz change to track reachability drift.`);
console.log('═'.repeat(70));
