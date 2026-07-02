#!/usr/bin/env node
/**
 * F4 — Tag validation / lint script.
 * F9 — Optional full stats table mode.
 *
 * Collects all tags referenced by the quiz (Q1-Q6 answer options + nfl_mapping)
 * and all tags present on clubs, then reports:
 *   - DEAD tags:    set by quiz but on zero clubs
 *   - ORPHANED tags: on clubs but no quiz answer sets them
 *
 * Q7 is nfl-selector type with options: null — skipped when collecting quiz tags.
 * nfl_mapping's 4 string tags (stability, fan-culture, ambition, narrative)
 * are considered quiz-referenced since the NFL boost uses them.
 *
 * Exit non-zero on any issue (dead or orphaned).
 *
 * Usage:
 *   node scripts/validate-tags.js            # pass/fail
 *   node scripts/validate-tags.js --stats    # full stats table
 */
const fs = require('fs');
const path = require('path');

const clubsPath = path.join(__dirname, '..', 'clubs.json');
const quizPath  = path.join(__dirname, '..', 'quiz.json');

const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));
const quiz  = JSON.parse(fs.readFileSync(quizPath, 'utf8'));

const N = clubs.length;
const STRING_TAGS = ['stability', 'fan-culture', 'ambition', 'narrative'];

// ── Collect quiz-referenced tags ──
const quizTagsNumeric = new Set();   // numeric tags set by Q1-Q6
const quizTagsString  = new Set();   // string tags set by Q1-Q6 (tag names only)
const quizStringVals = {};           // tag -> Set of values referenced

quiz.questions.forEach(q => {
  if (q.type !== 'standard') return;        // skip Q7 (nfl-selector, options: null)
  (q.options || []).forEach(opt => {
    Object.entries(opt.tags || {}).forEach(([tag, val]) => {
      if (typeof val === 'number' && val !== 0) {
        quizTagsNumeric.add(tag);
      } else if (typeof val === 'string') {
        quizTagsString.add(tag);
        if (!quizStringVals[tag]) quizStringVals[tag] = new Set();
        quizStringVals[tag].add(val);
      }
    });
  });
});

// nfl_mapping references the 4 string tags — mark them as quiz-referenced
const nflQ = quiz.questions.find(q => q.type === 'nfl-selector');
if (nflQ && nflQ.nfl_mapping) {
  Object.values(nflQ.nfl_mapping).forEach(entry => {
    Object.entries(entry.tags || {}).forEach(([tag, val]) => {
      if (typeof val === 'string') {
        quizTagsString.add(tag);
        if (!quizStringVals[tag]) quizStringVals[tag] = new Set();
        quizStringVals[tag].add(val);
      }
    });
  });
}

// ── Collect club-present tags ──
const clubTagsNumeric = new Set();
const clubTagsString  = new Set();
const clubStringVals = {};               // tag -> Set of values present on clubs
const dfNumeric = {};                    // tag -> document frequency (count of clubs)
const dfString = {};                     // tag -> { value -> count }

clubs.forEach(club => {
  Object.entries(club.tags || {}).forEach(([tag, val]) => {
    if (typeof val === 'number') {
      clubTagsNumeric.add(tag);
      dfNumeric[tag] = (dfNumeric[tag] || 0) + 1;
    } else if (typeof val === 'string') {
      clubTagsString.add(tag);
      if (!clubStringVals[tag]) clubStringVals[tag] = new Set();
      clubStringVals[tag].add(val);
      if (!dfString[tag]) dfString[tag] = {};
      dfString[tag][val] = (dfString[tag][val] || 0) + 1;
    }
  });
});

// ── Compute dead / orphaned ──
// DEAD: referenced by quiz but on zero clubs.
//   - numeric: in quizTagsNumeric but not in clubTagsNumeric
//   - string:  in quizTagsString but not in clubTagsString, OR a referenced
//              value not present on any club
const deadNumeric = [...quizTagsNumeric].filter(t => !clubTagsNumeric.has(t));
const deadString  = [...quizTagsString].filter(t => !clubTagsString.has(t));
const deadStringVals = [];
Object.keys(quizStringVals).forEach(tag => {
  if (!clubStringVals[tag]) {
    // whole tag dead — already captured above
    quizStringVals[tag].forEach(v => deadStringVals.push(`${tag}:${v}`));
    return;
  }
  quizStringVals[tag].forEach(v => {
    if (!clubStringVals[tag].has(v)) deadStringVals.push(`${tag}:${v}`);
  });
});

// ORPHANED: on clubs but no quiz answer sets them.
//   - numeric: in clubTagsNumeric but not in quizTagsNumeric
//   - string:  in clubTagsString but not in quizTagsString
const orphanedNumeric = [...clubTagsNumeric].filter(t => !quizTagsNumeric.has(t));
const orphanedString  = [...clubTagsString].filter(t => !quizTagsString.has(t));

// ── Report ──
const statsMode = process.argv.includes('--stats');

console.log('═'.repeat(72));
console.log('FAN PASSPORT — Tag Validator (F4' + (statsMode ? ' + F9 stats' : '') + ')');
console.log('═'.repeat(72));
console.log('');
console.log(`Clubs: ${N}   Quiz questions: ${quiz.questions ? quiz.questions.length : '?'}   (Q1-Q6 standard, Q7 nfl-selector)`);
console.log(`Quiz-referenced numeric tags: ${quizTagsNumeric.size}`);
console.log(`Quiz-referenced string tags:  ${quizTagsString.size}  (${STRING_TAGS.join(', ')})`);
console.log(`Club-present numeric tags:    ${clubTagsNumeric.size}`);
console.log(`Club-present string tags:     ${clubTagsString.size}`);
console.log('');

let issues = 0;

if (deadNumeric.length) {
  console.log('❌ DEAD numeric tags (set by quiz, on zero clubs):');
  deadNumeric.forEach(t => { console.log(`   ${t}`); issues++; });
  console.log('');
} else {
  console.log('✅ No dead numeric tags.');
}
if (deadString.length) {
  console.log('❌ DEAD string tags (set by quiz, on zero clubs):');
  deadString.forEach(t => { console.log(`   ${t}`); issues++; });
  console.log('');
} else {
  console.log('✅ No dead string tags.');
}
if (deadStringVals.length) {
  console.log('❌ DEAD string values (set by quiz, on zero clubs):');
  deadStringVals.forEach(t => { console.log(`   ${t}`); issues++; });
  console.log('');
} else {
  console.log('✅ No dead string values.');
}
if (orphanedNumeric.length) {
  console.log('⚠️  ORPHANED numeric tags (on clubs, no quiz answer sets them):');
  orphanedNumeric.forEach(t => { console.log(`   ${t}  (df=${dfNumeric[t]})`); issues++; });
  console.log('');
} else {
  console.log('✅ No orphaned numeric tags.');
}
if (orphanedString.length) {
  console.log('⚠️  ORPHANED string tags (on clubs, no quiz answer sets them):');
  orphanedString.forEach(t => { console.log(`   ${t}`); issues++; });
  console.log('');
} else {
  console.log('✅ No orphaned string tags.');
}

// ── F9: full stats table ──
if (statsMode) {
  console.log('');
  console.log('═'.repeat(72));
  console.log('F9 — TAG STATS TABLE');
  console.log('═'.repeat(72));
  console.log('');

  // Numeric tags
  console.log('NUMERIC TAGS (sorted by df descending)');
  console.log('-'.repeat(72));
  console.log('tag                          df    idf(ln N/df)   % clubs');
  console.log('-'.repeat(72));
  const numericRows = Object.entries(dfNumeric)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, df]) => {
      const idf = Math.log(N / df);
      const pct = ((df / N) * 100).toFixed(1) + '%';
      const status = !quizTagsNumeric.has(tag) ? ' [orphan]' : '';
      return { tag, df, idf, pct, status };
    });

  // Compute min/max/avg for numeric df
  const dfs = Object.values(dfNumeric);
  const minDf = Math.min(...dfs);
  const maxDf = Math.max(...dfs);
  const avgDf = (dfs.reduce((a, b) => a + b, 0) / dfs.length).toFixed(2);

  numericRows.forEach(r => {
    console.log(
      r.tag.padEnd(28) +
      String(r.df).padStart(4) +
      r.idf.toFixed(2).padStart(12) +
      r.pct.padStart(11) +
      r.status
    );
  });
  console.log('-'.repeat(72));
  console.log(`Numeric df:  min=${minDf}  max=${maxDf}  avg=${avgDf}  (across ${dfs.length} tags)`);
  console.log('');

  // String tags
  console.log('STRING TAGS (values sorted by df descending)');
  console.log('-'.repeat(72));
  console.log('tag:value                     df    idf(ln N/df)   % clubs');
  console.log('-'.repeat(72));
  const stringRows = [];
  Object.entries(dfString).forEach(([tag, vals]) => {
    Object.entries(vals).forEach(([val, df]) => {
      const idf = Math.log(N / df);
      const pct = ((df / N) * 100).toFixed(1) + '%';
      const status = !quizTagsString.has(tag) ? ' [orphan]' : '';
      stringRows.push({ tag, val, df, idf, pct, status });
    });
  });
  stringRows.sort((a, b) => b.df - a.df);
  stringRows.forEach(r => {
    console.log(
      (r.tag + ':' + r.val).padEnd(28) +
      String(r.df).padStart(4) +
      r.idf.toFixed(2).padStart(12) +
      r.pct.padStart(11) +
      r.status
    );
  });
  console.log('-'.repeat(72));
  const allStringDfs = stringRows.map(r => r.df);
  console.log(`String df:   min=${Math.min(...allStringDfs)}  max=${Math.max(...allStringDfs)}  avg=${(allStringDfs.reduce((a,b)=>a+b,0)/allStringDfs.length).toFixed(2)}  (across ${allStringDfs.length} tag:value pairs)`);
  console.log('');
}

// ── Summary ──
console.log('');
console.log('═'.repeat(72));
console.log(`SUMMARY: ${issues} issue(s)`);
console.log('═'.repeat(72));
if (issues > 0) {
  console.log('❌ VALIDATION FAILED — see issues above.');
  process.exit(1);
} else {
  console.log('✅ VALIDATION PASSED — zero dead, zero orphaned.');
  process.exit(0);
}