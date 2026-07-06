/* ============================================================
   Fan Passport — App Logic v2
   Loads clubs from clubs.json, handles quiz, matching,
   persistence (localStorage), shareable URLs, retake flow,
   floating share bar, NFL selector, and lightweight analytics.

   v2 changes:
   - New question structure: prompt/subtext/options[].description/tags
   - NFL team selector grid (Q7, type: "nfl-selector")
   - Scoring: intangible tags (stability, fan-culture, ambition, narrative)
   - NFL boost at 15% weight
   - Floating share bar on post-result screens
   - Toast notifications for share actions
   - Hide share bar when viewing via shared link
   ============================================================ */

let CLUBS = [];
let QUESTIONS = [];
let TAG_LABEL = {};
let NFL_TEAMS = [];
let NFL_MAPPING = {};
let NFL_SKIP_LABEL = "";

const LEAGUE_ORDER = ["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","MLS","Liga MX"];

let state = {
  view: "home",
  qIndex: 0,
  answers: [],  // array of option indices (or "nfl:<teamId>" / "nfl:skip" for Q7)
  results: [],  // top 3 match results
  currentClub: null,
  sharedResult: null,  // decoded from URL if present
  retakeMode: false,   // true when user jumped from results to edit one answer
  shareBarDismissed: false,
};

const STORAGE_KEY = "fan-passport-state";
const ANALYTICS_KEY = "fan-passport-analytics";

/* ──── Init ──── */

async function init(){
  showLoading();
  try {
    const [clubRes, quizRes] = await Promise.all([
      fetch("clubs.json"),
      fetch("quiz.json"),
    ]);
    CLUBS = await clubRes.json();
    const quizData = await quizRes.json();
    QUESTIONS = quizData.questions;
    TAG_LABEL = quizData.tag_labels || {};
    // Extract NFL data from Q7
    const nflQ = QUESTIONS.find(q => q.type === "nfl-selector");
    if(nflQ){
      NFL_TEAMS = nflQ.nfl_teams || [];
      NFL_MAPPING = nflQ.nfl_mapping || {};
      NFL_SKIP_LABEL = nflQ.skip_option || "I don't follow the NFL";
    }
  } catch(e) {
    console.error("Failed to load data:", e);
    document.getElementById("app").innerHTML = `<div class="loading">Failed to load club data. Make sure you're serving via HTTP (not file://).</div>`;
    return;
  }

  // Check for shared link
  const shared = checkSharedLink();
  if(shared){
    state.sharedResult = shared;
    state.answers = shared.answers;
    state.results = shared.results;
    state.view = "result";
  } else {
    // Restore from localStorage
    const saved = restoreState();
    if(saved){
      state = Object.assign(state, saved);
    }
  }

  render();
}

function showLoading(){
  document.getElementById("app").innerHTML = `<div class="loading">Loading club data<span class="dots"></span></div>`;
}

/* ──── Persistence ──── */

function saveState(){
  try {
    const toSave = {
      view: state.view,
      qIndex: state.qIndex,
      answers: state.answers,
      results: state.results,
      currentClub: state.currentClub ? state.currentClub.id : null,
      shareBarDismissed: state.shareBarDismissed,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch(e) { /* storage might be unavailable */ }
}

function restoreState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const saved = JSON.parse(raw);
    // Rehydrate currentClub from id
    if(saved.currentClub){
      saved.currentClub = CLUBS.find(c => c.id === saved.currentClub) || null;
    }
    return saved;
  } catch(e) { return null; }
}

function clearSavedState(){
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

/* ──── Is this a shared link view? ──── */

function isSharedView(){
  return state.sharedResult && state.sharedResult.isShared;
}

/* ──── Shareable Links ──── */

// Encode quiz answers as base64 URL param
// Format: r=<base64 of answers array> → recompute results client-side
function generateShareURL(){
  if(!state.results.length) return null;
  const answersStr = JSON.stringify(state.answers);
  const b64 = btoa(answersStr);
  const url = new URL(window.location.href);
  url.hash = ""; url.search = "?r=" + b64;
  return url.toString();
}

function checkSharedLink(){
  const params = new URLSearchParams(window.location.search);
  const r = params.get("r");
  if(!r) return null;
  try {
    const answersStr = atob(r);
    const answers = JSON.parse(answersStr);
    if(!Array.isArray(answers) || answers.length !== QUESTIONS.length) return null;
    // Recompute results from answers
    const results = computeResults(answers);
    // Strip the param from URL (replaceState, no reload)
    const cleanURL = window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
    return { answers, results, isShared: true };
  } catch(e) {
    return null;
  }
}

/* ──── Analytics ──── */

// Lightweight, privacy-respecting: stores answer→result correlations
// entirely in localStorage. No external calls.
function logResult(answers, results){
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    const data = raw ? JSON.parse(raw) : { entries: [] };
    data.entries.push({
      ts: Date.now(),
      answers: answers,
      topMatch: results[0] ? results[0].club.id : null,
      topPct: results[0] ? results[0].pct : null,
      topTags: results[0] ? results[0].topTags : [],
    });
    // Cap at 1000 entries to avoid unbounded growth
    if(data.entries.length > 1000) data.entries = data.entries.slice(-1000);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch(e) {}
}

/* ──── Matching Algorithm (v2) ──── */

// F5 — IDF (inverse document frequency) rarity-weighted scoring.
// Precompute document frequencies and IDF weights from the club corpus.
// A tag on all 144 clubs gets idf=0 → stops influencing scoring.
// idf = ln(N / df) where N = total clubs, df = clubs with that tag (or tag:value).
let IDF_CACHE = null;

function buildIdfTables(){
  if(IDF_CACHE) return IDF_CACHE;
  const N = CLUBS.length;
  const numeric = {};   // tag → idf
  const string = {};    // tag → { value → idf }

  // Numeric df
  const numDf = {};
  // String df
  const strDf = {};

  CLUBS.forEach(club => {
    Object.entries(club.tags || {}).forEach(([tag, val]) => {
      if(typeof val === "number") {
        numDf[tag] = (numDf[tag] || 0) + 1;
      } else if(typeof val === "string") {
        if(!strDf[tag]) strDf[tag] = {};
        strDf[tag][val] = (strDf[tag][val] || 0) + 1;
      }
    });
  });

  Object.entries(numDf).forEach(([tag, df]) => {
    numeric[tag] = Math.log(N / df);
  });
  Object.entries(strDf).forEach(([tag, vals]) => {
    string[tag] = {};
    Object.entries(vals).forEach(([val, df]) => {
      string[tag][val] = Math.log(N / df);
    });
  });

  IDF_CACHE = { numeric, string, N };
  return IDF_CACHE;
}

function computeResults(answers){
  const idf = buildIdfTables();

  // Build a profile from quiz answers Q1-Q6 (standard questions)
  // Profile is a map: tag → accumulated weight
  const profile = {};

  answers.forEach((ans, qIdx) => {
    const q = QUESTIONS[qIdx];
    if(!q) return;
    if(q.type === "nfl-selector") return; // NFL handled separately
    if(typeof ans !== "number") return;
    const opt = q.options[ans];
    if(!opt) return;
    Object.entries(opt.tags || {}).forEach(([tag, val]) => {
      if(typeof val === "number" && val !== 0) {
        profile[tag] = (profile[tag] || 0) + val;
      }
      // String-valued tags (stability, fan-culture, ambition, narrative) are handled below
    });
  });

  // Build intangible tag profile from Q2, Q3, Q5, Q6
  // These store string values in the answer's tags
  const intangibleProfile = {}; // e.g. { "fan-culture": "ultras", "narrative": "underdog", ... }
  answers.forEach((ans, qIdx) => {
    const q = QUESTIONS[qIdx];
    if(!q || q.type !== "standard") return;
    if(typeof ans !== "number") return;
    const opt = q.options[ans];
    if(!opt) return;
    Object.entries(opt.tags || {}).forEach(([tag, val]) => {
      if(typeof val === "string") {
        intangibleProfile[tag] = val;
      }
    });
  });

  // Score each club from Q1-Q6, weighted by IDF (rarity)
  const scored = CLUBS.map(club => {
    let score = 0;
    const contributions = [];

    // Numeric tag matching (Q1, Q4, and numeric parts of other questions)
    // F5: weight = userWeight * clubWeight * idf.numeric[tag]
    Object.entries(profile).forEach(([tag, val]) => {
      const clubVal = club.tags[tag];
      if(typeof clubVal !== "number") return;
      const idfWeight = idf.numeric[tag] || 0;
      const contrib = val * clubVal * idfWeight;
      if(contrib > 0) contributions.push({tag, contrib});
      score += contrib;
    });

    // Intangible tag matching (Q2, Q3, Q5, Q6)
    // F5: weight = 3 * idf.string[tag][value]
    Object.entries(intangibleProfile).forEach(([tag, val]) => {
      const clubVal = club.tags[tag];
      if(typeof clubVal === "string" && clubVal === val) {
        const idfWeight = (idf.string[tag] && idf.string[tag][val]) || 0;
        const contrib = 3 * idfWeight;
        if(contrib > 0) contributions.push({tag, contrib});
        score += contrib;
      }
    });

    // F5 — Dominance cap: no single tag may account for >40% of total score.
    // If a tag exceeds the cap, scale it down to 40% and redistribute.
    if(score > 0 && contributions.length > 1) {
      const cap = 0.40 * score;
      let excess = 0;
      contributions.forEach(c => {
        if(c.contrib > cap) {
          excess += (c.contrib - cap);
          c.contrib = cap;
        }
      });
      // Rescale all contributions proportionally to absorb the excess,
      // then recompute score from the capped contributions.
      if(excess > 0) {
        score = contributions.reduce((sum, c) => sum + c.contrib, 0);
      }
    }

    return { club, score, contributions };
  });

  // Find the baseScore max for normalization
  scored.sort((a, b) => b.score - a.score);
  const maxBaseScore = scored[0].score || 1;

  // Apply NFL boost (Q7)
  const nflAnswer = answers[QUESTIONS.findIndex(q => q.type === "nfl-selector")];
  let nflTeamId = null;
  if(typeof nflAnswer === "string" && nflAnswer.startsWith("nfl:") && nflAnswer !== "nfl:skip") {
    nflTeamId = nflAnswer.substring(4);
  }

  if(nflTeamId && NFL_MAPPING[nflTeamId]) {
    const mapping = NFL_MAPPING[nflTeamId];
    const nflTags = mapping.tags || {};
    const weight = mapping.weight || 1.0;
    const totalBoostFraction = weight * 0.15; // 15% of total score, adjusted by weight
    const perDimBoost = totalBoostFraction / 4; // each matching dimension contributes 1/4 of the boost

    scored.forEach(s => {
      let boost = 0;
      Object.entries(nflTags).forEach(([dim, val]) => {
        if(s.club.tags[dim] === val) {
          boost += perDimBoost * maxBaseScore;
        }
      });
      s.score += boost;
      if(boost > 0) {
        s.contributions.push({tag: "nfl-boost", contrib: boost});
      }
    });
  }

  // Re-sort after NFL boost
  scored.sort((a, b) => b.score - a.score);
  // topScore = post-boost max, used ONLY as percentage denominator.
  // (maxBaseScore above is pre-boost max, used ONLY to size the NFL boost.)
  const topScore = scored[0].score || 1;

  return scored.slice(0, 3).map(s => ({
    club: s.club,
    pct: Math.min(100, Math.round((s.score / topScore) * 100)),
    topTags: s.contributions.sort((a,b) => b.contrib - a.contrib).slice(0, 5).map(c => c.tag),
  }));
}

/* ──── Quiz Flow ──── */

function startQuiz(){
  state.qIndex = 0;
  state.answers = [];
  state.results = [];
  state.sharedResult = null;
  state.retakeMode = false;
  state.shareBarDismissed = false;
  clearSavedState();
  go("quiz");
}

function selectOption(qIdx, optIdx){
  state.answers[qIdx] = optIdx;
  if(state.retakeMode){
    // Recompute results and return to result page
    state.results = computeResults(state.answers);
    state.retakeMode = false;
    state.view = "result";
    logResult(state.answers, state.results);
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
    return;
  }
  saveState();
  render();
}

function selectNFL(teamId){
  state.answers[state.qIndex] = "nfl:" + teamId;
  if(state.retakeMode){
    state.results = computeResults(state.answers);
    state.retakeMode = false;
    state.view = "result";
    logResult(state.answers, state.results);
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
    return;
  }
  saveState();
  render();
}

function skipNFL(){
  state.answers[state.qIndex] = "nfl:skip";
  if(state.retakeMode){
    state.results = computeResults(state.answers);
    state.retakeMode = false;
    state.view = "result";
    logResult(state.answers, state.results);
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
    return;
  }
  saveState();
  render();
}

function nextQuestion(){
  if(state.answers[state.qIndex] === undefined) return;
  if(state.qIndex < QUESTIONS.length - 1){
    state.qIndex++;
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
  } else {
    submitQuiz();
  }
}

function prevQuestion(){
  if(state.qIndex > 0){
    state.qIndex--;
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
  }
}

function jumpToQuestion(qIdx){
  // Used by retake flow — jump directly to a specific question
  if(qIdx >= 0 && qIdx < QUESTIONS.length){
    state.qIndex = qIdx;
    state.view = "quiz";
    state.retakeMode = true;
    saveState();
    render();
    window.scrollTo({top:0, behavior:"smooth"});
  }
}

function submitQuiz(){
  const results = computeResults(state.answers);
  state.results = results;
  state.view = "result";
  state.shareBarDismissed = false;
  logResult(state.answers, results);
  saveState();
  render();
  window.scrollTo({top:0, behavior:"smooth"});
}

/* ──── Retake Flow ──── */

// Quick retake: show chips for each answered question, let user jump to any
function toggleRetakeBar(){
  const bar = document.getElementById("retakeBar");
  if(bar.style.display === "none" || !bar.style.display){
    bar.style.display = "block";
  } else {
    bar.style.display = "none";
  }
}

// Cancel retake mode — return to results without changing answer
function cancelRetake(){
  state.retakeMode = false;
  state.view = "result";
  saveState();
  render();
  window.scrollTo({top:0, behavior:"smooth"});
}

/* ──── Navigation ──── */

function go(view, extra){
  state.view = view;
  if(extra) Object.assign(state, extra);
  saveState();
  render();
  window.scrollTo({top:0, behavior:"smooth"});
}

function openDossier(clubId){
  const club = CLUBS.find(c => c.id === clubId);
  if(!club) return;
  state.currentClub = club;
  go("dossier");
}

/* ──── Render ──── */

function render(){
  const app = document.getElementById("app");
  if(state.view === "home") { resetOGMeta(); app.innerHTML = renderHome(); }
  else if(state.view === "quiz") { resetOGMeta(); app.innerHTML = renderQuiz(); }
  else if(state.view === "result") app.innerHTML = renderResult();
  else if(state.view === "dossier") { resetOGMeta(); app.innerHTML = renderDossier(); }
  else if(state.view === "browse") { resetOGMeta(); app.innerHTML = renderBrowse(); }
  attachHandlers();
  renderShareBar();
  renderToast();
}

function renderHome(){
  const clubCount = CLUBS.length;
  return `
  <section class="hero">
    <div class="wrap">
      <div class="eyebrow">${LEAGUE_ORDER.length} leagues · ${clubCount} clubs · one interview</div>
      <h1>Your club is waiting to stamp you in.</h1>
      <p class="lede">The World Cup made you a soccer fan. Now the actual leagues are kicking off — Premier League, La Liga, Serie A, Bundesliga, Ligue 1, MLS, and Liga MX — and you need somewhere to point your Saturday mornings. Answer a short interview, get matched to a club by identity and playing style, then read the full country-file on where you're headed.</p>
      <div class="hero-actions">
        <button class="btn" data-nav="quiz">Begin the interview →</button>
        <button class="btn secondary" data-nav="browse">Skip to the directory</button>
      </div>
      <div class="stat-strip">
        <div><div class="num">${clubCount}</div><div class="lab">Clubs profiled</div></div>
        <div><div class="num">${QUESTIONS.length}</div><div class="lab">Questions</div></div>
        <div><div class="num">${LEAGUE_ORDER.length}</div><div class="lab">Leagues covered</div></div>
      </div>
    </div>
  </section>`;
}

function renderQuiz(){
  const q = QUESTIONS[state.qIndex];
  const selected = state.answers[state.qIndex];
  const stamps = QUESTIONS.map((_, i) =>
    `<div class="mini-stamp ${state.answers[i] !== undefined ? 'filled' : ''}"></div>`
  ).join("");

  let contentHTML = "";
  let navHTML = "";

  if(q.type === "nfl-selector"){
    contentHTML = renderNFLSelector(q, selected);
  } else {
    contentHTML = renderStandardOptions(q, selected);
  }

  const isLast = state.qIndex === QUESTIONS.length - 1;
  const nextLabel = isLast ? 'Stamp my passport →' : 'Next →';
  const nextDisabled = selected === undefined;

  // In retake mode, show a different nav: cancel goes back to results
  if(state.retakeMode){
    navHTML = `
    <div class="quiz-nav">
      <button class="btn secondary" id="cancelRetakeBtn">← Back to results</button>
      <span class="step-count">${selected !== undefined ? 'Answer saved — click back to results' : 'Pick a new answer'}</span>
      <span></span>
    </div>`;
  } else {
    navHTML = `
    <div class="quiz-nav">
      <button class="btn secondary" id="prevBtn" ${state.qIndex === 0 ? 'style="visibility:hidden"' : ''}>← Back</button>
      <span class="step-count">${selected !== undefined ? '' : 'Pick one to continue'}</span>
      <button class="btn" id="nextBtn" ${nextDisabled ? 'disabled' : ''}>${nextLabel}</button>
    </div>`;
  }

  return `
  <section class="quiz-shell">
    <div class="wrap">
      <div class="quiz-card">
        <div class="page-marker">
          <span>Page ${state.qIndex + 1} of ${QUESTIONS.length}</span>
          <div class="stamp-row">${stamps}</div>
        </div>
        <h2>${q.prompt}</h2>
        <div class="qsub">${q.subtext || q.sub || ""}</div>
        ${contentHTML}
        ${navHTML}
      </div>
    </div>
  </section>`;
}

function renderStandardOptions(q, selected){
  const options = q.options.map((opt, i) => `
    <div class="option ${selected === i ? 'selected' : ''}" data-select="${i}">
      <div class="letter">${String.fromCharCode(65 + i)}</div>
      <div class="otext"><strong>${opt.label}</strong><span>${opt.description || opt.text || ""}</span></div>
    </div>
  `).join("");
  return `<div class="options">${options}</div>`;
}

function renderNFLSelector(q, selected){
  // Group teams by conference → division
  const conferences = ["AFC", "NFC"];
  const divisions = ["North", "East", "South", "West"];
  let html = '<div class="nfl-grid">';

  conferences.forEach(conf => {
    html += `<div class="nfl-conference"><div class="nfl-conf-header">${conf}</div>`;
    divisions.forEach(div => {
      const teams = NFL_TEAMS.filter(t => t.conference === conf && t.division === div);
      if(!teams.length) return;
      html += `<div class="nfl-division-group"><div class="nfl-div-header">${conf} ${div}</div>`;
      teams.forEach(team => {
        const isSelected = selected === ("nfl:" + team.id);
        html += `
          <div class="nfl-team ${isSelected ? 'selected' : ''}" data-nfl="${team.id}">
            <span class="nfl-team-conf">${conf}</span>
            <span class="nfl-team-name">${team.name}</span>
          </div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  });

  // Skip option
  const skipSelected = selected === "nfl:skip";
  html += `<div class="nfl-skip ${skipSelected ? 'selected' : ''}" data-nfl-skip="1">${NFL_SKIP_LABEL}</div>`;
  html += '</div>';
  return html;
}

function renderResult(){
  if(!state.results.length) return renderHome();
  const top = state.results[0];
  const runners = state.results.slice(1);
  const isShared = isSharedView();
  const chips = top.topTags.map(t => `<span class="why-chip">${TAG_LABEL[t] || t}</span>`).join("");
  const runnerCards = runners.map(r => `
    <div class="runner-card" data-open="${r.club.id}">
      ${crestHTML(r.club, "crest-md")}
      <div>
        <div class="rname">${r.club.name}</div>
        <div class="rleague">${r.club.league} · ${r.pct}% match</div>
      </div>
    </div>
  `).join("");

  // Retake chips: one per answered question
  const retakeChips = state.answers.map((ans, i) => {
    const q = QUESTIONS[i];
    let label = "—";
    if(q.type === "nfl-selector"){
      if(typeof ans === "string" && ans === "nfl:skip") label = NFL_SKIP_LABEL;
      else if(typeof ans === "string" && ans.startsWith("nfl:")) {
        const tid = ans.substring(4);
        const team = NFL_TEAMS.find(t => t.id === tid);
        label = team ? team.name : "NFL";
      }
    } else if(typeof ans === "number" && q.options[ans]) {
      label = q.options[ans].label;
    }
    return `<div class="retake-chip" data-jump="${i}">Q${i+1}: ${label}</div>`;
  }).join("");

  const sharedNote = isShared ? `<div class="why-chip" style="border-color:var(--visa-red);color:var(--visa-red)">Shared result</div>` : "";

  // Shared link CTA
  const sharedCTA = isShared ? `
    <div class="shared-cta">
      <button class="btn" data-nav="quiz">Take the quiz yourself →</button>
    </div>` : "";

  // Update OG meta tags for this specific club result
  updateOGMeta(top.club);

  return `
  <section class="result-shell">
    <div class="wrap">
      <div class="result-top">
        ${crestHTML(top.club, "crest-xl")}
        <div class="result-meta">
          <div class="granted">Entry granted ${sharedNote}</div>
          <h2>${top.club.name}</h2>
          <div class="subline">${top.club.nick} · ${top.club.league}, ${top.club.country}</div>
          <div class="match-pct">Match strength: <b>${top.pct}%</b></div>
        </div>
      </div>
      <div class="why-row">${chips}</div>
      <div class="result-actions">
        <button class="btn" data-open="${top.club.id}">Read the full dossier →</button>
        <button class="btn secondary" id="shareBtn">Copy share link</button>
        <button class="btn secondary" id="shareXBtn">Share on X</button>
        ${isShared ? "" : '<button class="text-link" id="retakeBtn">Quick retake</button>'}
        ${isShared ? "" : '<button class="text-link" data-nav="quiz">Full retake</button>'}
        <button class="text-link" data-nav="browse">Browse all clubs</button>
      </div>
      <div class="share-link-box" id="shareBox"></div>
      <div class="retake-bar" id="retakeBar" style="display:none">
        <div class="rt-label">Click any answer to jump back and change it</div>
        <div class="retake-chips">${retakeChips}</div>
      </div>
      <div class="runners">
        <h3>Also under consideration</h3>
        <div class="runner-grid">${runnerCards}</div>
      </div>
      ${sharedCTA}
    </div>
  </section>`;
}

function renderDossier(){
  const c = state.currentClub;
  if(!c) return renderBrowse();
  const tagList = Object.keys(c.tags).slice(0, 8).map(t => {
    const val = c.tags[t];
    if(typeof val === "string") return `<span>${t}: ${val}</span>`;
    return `<span>${TAG_LABEL[t] || t}</span>`;
  }).join("");
  const bandText = contrastColor(c.c1);
  return `
  <section class="dossier-band" style="background:${c.c1};color:${bandText}">
    <div class="wrap">
      <div class="crest crest-lg dossier-crest" style="background:${c.c2};color:${contrastColor(c.c2)}">${initials(c.name)}</div>
      <div>
        <div class="dname display">${c.name}</div>
        <div class="dmeta">${c.nick} · ${c.league}, ${c.country} · Founded ${c.founded}</div>
      </div>
    </div>
  </section>
  <section class="dossier-body">
    <div class="wrap">
      <span class="back-link" data-nav="browse" role="button" tabindex="0">← Back to directory</span>
      <div class="field">
        <div class="flabel">Identity</div>
        <div class="fval serif">${c.identity}</div>
      </div>
      <div class="field-grid">
        <div class="field">
          <div class="flabel">Home ground</div>
          <div class="fval">${c.stadium}</div>
        </div>
        <div class="field">
          <div class="flabel">Honours</div>
          <div class="fval">${c.honours}</div>
        </div>
      </div>
      ${c.lastSeason ? `
      <div class="field-grid">
        <div class="field">
          <div class="flabel">Latest season</div>
          <div class="fval">${c.lastSeason}</div>
        </div>
        <div class="field">
          <div class="flabel">History</div>
          <div class="fval">${c.history}</div>
        </div>
      </div>` : `
      <div class="field">
        <div class="flabel">History</div>
        <div class="fval">${c.history}</div>
      </div>`}
      <div class="field-grid">
        <div class="field">
          <div class="flabel">Rivals</div>
          <div class="fval">${c.rivals.map(r => `• ${r}`).join("<br>")}</div>
        </div>
        <div class="field">
          <div class="flabel">Legends</div>
          <div class="fval">${c.legends.join(" · ")}</div>
        </div>
      </div>
      ${c.keyPlayers && c.keyPlayers.length ? `
      <div class="field-grid">
        <div class="field">
          <div class="flabel">Players to know right now</div>
          <div class="fval">${c.keyPlayers.map(p => `• ${p}`).join("<br>")}</div>
        </div>
        <div class="field">
          <div class="flabel">What to watch for</div>
          <div class="fval">${c.watch}</div>
        </div>
      </div>` : `
      <div class="field">
        <div class="flabel">What to watch for</div>
        <div class="fval">${c.watch}</div>
      </div>`}
      <div class="field">
        <div class="flabel">Identity tags</div>
        <div class="tagpills">${tagList}</div>
      </div>
    </div>
  </section>`;
}

function renderBrowse(){
  const groups = LEAGUE_ORDER.map(league => {
    const clubs = CLUBS.filter(c => c.league === league);
    if(!clubs.length) return "";
    const country = clubs[0].country;
    const cards = clubs.map(c => `
      <div class="club-card" data-open="${c.id}">
        ${crestHTML(c, "crest-sm")}
        <div>
          <div class="cname">${c.name}</div>
          <div class="cid">${c.nick}</div>
        </div>
      </div>
    `).join("");
    return `
      <div class="league-group">
        <div class="league-head">
          <h2>${league}</h2>
          <span class="country">${country}</span>
          <span class="count">${clubs.length} clubs</span>
        </div>
        <div class="club-grid">${cards}</div>
      </div>`;
  }).filter(g => g).join("");
  return `
  <section class="browse-shell">
    <div class="wrap">
      <div class="eyebrow">Full directory</div>
      <h1 style="font-size:clamp(26px,4vw,38px);margin-bottom:28px;">Every club, every league.</h1>
      ${groups}
    </div>
  </section>`;
}

/* ──── Floating Share Bar ──── */

function renderShareBar(){
  // Remove existing share bar
  const existing = document.getElementById("shareBar");
  if(existing) existing.remove();

  // Don't show share bar if:
  // 1. No results
  // 2. Viewing via shared link (viewer hasn't taken the quiz)
  // 3. Dismissed
  // 4. On home or quiz screens
  if(!state.results.length) return;
  if(isSharedView()) return;
  if(state.shareBarDismissed) return;
  if(state.view === "home" || state.view === "quiz") return;

  const top = state.results[0];
  if(!top) return;

  const bar = document.createElement("div");
  bar.id = "shareBar";
  bar.className = "share-bar";
  bar.innerHTML = `
    <div class="crest crest-sm share-bar-crest" style="background:${top.club.c1};color:${contrastColor(top.club.c1)}">${initials(top.club.name)}</div>
    <div class="share-bar-info">
      <div class="share-bar-name">${top.club.name}</div>
      <div class="share-bar-pct">${top.pct}% match</div>
    </div>
    <button class="share-bar-btn" id="barShareBtn">Share</button>
    <button class="share-bar-x" id="barDismissBtn">×</button>
  `;

  document.body.appendChild(bar);

  // Attach handlers
  const shareB = document.getElementById("barShareBtn");
  if(shareB) shareB.onclick = copyShareLink;
  const dismissB = document.getElementById("barDismissBtn");
  if(dismissB) dismissB.onclick = dismissShareBar;
}

function dismissShareBar(){
  state.shareBarDismissed = true;
  saveState();
  const bar = document.getElementById("shareBar");
  if(bar) bar.remove();
}

/* ──── Toast ──── */

let toastTimer = null;
function showToast(msg){
  let toast = document.getElementById("toast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function renderToast(){
  // Ensure toast element exists (created on demand by showToast)
}

/* ──── Helpers ──── */

function updateOGMeta(club){
  const setMeta = (prop, val) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if(!el) return;
    el.setAttribute("content", val);
  };
  const setTwitter = (name, val) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if(!el) return;
    el.setAttribute("content", val);
  };

  const title = `Fan Passport — You matched ${club.name}`;
  const desc = `${club.name} (${club.nick}) · ${club.league}, ${club.country}. Matched by identity and playing style.`;
  const img = `og/${club.id}.png`;

  setMeta("og:title", title);
  setMeta("og:description", desc);
  setMeta("og:image", img);
  setTwitter("twitter:title", title);
  setTwitter("twitter:description", desc);
  setTwitter("twitter:image", img);
  document.title = title;
}

function resetOGMeta(){
  const setMeta = (prop, val) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if(!el) return;
    el.setAttribute("content", val);
  };
  const setTwitter = (name, val) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if(!el) return;
    el.setAttribute("content", val);
  };
  setMeta("og:title", "Fan Passport — Find Your Club");
  setMeta("og:description", "Answer a short interview, get matched to a soccer club by identity and playing style. 140+ clubs across 7 leagues.");
  setMeta("og:image", "og-share-card.png");
  setTwitter("twitter:title", "Fan Passport — Find Your Club");
  setTwitter("twitter:description", "Answer a short interview, get matched to a soccer club.");
  setTwitter("twitter:image", "og-share-card.png");
  document.title = "Fan Passport — Find Your Club";
}

function initials(name){
  const cleaned = name.replace(/FC|CF|SSC|AC|AS|SC|BC|SS|Ligue 1|Liga MX|MLS/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 1 || w === w.toUpperCase());
  if(words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* Contrast-safe text color for a given hex background.
   Uses relative luminance (WCAG). Returns "#fff" or "#1b1b17". */
function contrastColor(hex){
  if(!hex || typeof hex !== "string") return "#fff";
  const h = hex.replace("#", "");
  if(h.length !== 6 && h.length !== 3) return "#fff";
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return L > 0.45 ? "#1b1b17" : "#fff";
}

/* Build a crest element string with a contrast-safe text color.
   sizeClass is one of: crest-sm, crest-md, crest-lg, crest-xl */
function crestHTML(club, sizeClass){
  const fg = contrastColor(club.c1);
  return `<div class="crest ${sizeClass}" style="background:${club.c1};color:${fg}">${initials(club.name)}</div>`;
}

function attachHandlers(){
  // Keyboard activation for role="button" elements (spans/divs acting as buttons)
  document.querySelectorAll('[role="button"]').forEach(el => {
    el.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        el.click();
      }
    });
  });
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.onclick = () => {
      const target = el.getAttribute("data-nav");
      if(target === "quiz") startQuiz();
      else go(target);
    };
  });
  document.querySelectorAll("[data-select]").forEach(el => {
    el.onclick = () => selectOption(state.qIndex, parseInt(el.getAttribute("data-select")));
  });
  document.querySelectorAll("[data-open]").forEach(el => {
    el.onclick = () => openDossier(el.getAttribute("data-open"));
  });
  document.querySelectorAll("[data-jump]").forEach(el => {
    el.onclick = () => jumpToQuestion(parseInt(el.getAttribute("data-jump")));
  });
  // NFL selector
  document.querySelectorAll("[data-nfl]").forEach(el => {
    el.onclick = () => selectNFL(el.getAttribute("data-nfl"));
  });
  document.querySelectorAll("[data-nfl-skip]").forEach(el => {
    el.onclick = () => skipNFL();
  });

  const nextBtn = document.getElementById("nextBtn");
  if(nextBtn) nextBtn.onclick = nextQuestion;
  const prevBtn = document.getElementById("prevBtn");
  if(prevBtn) prevBtn.onclick = prevQuestion;

  const shareBtn = document.getElementById("shareBtn");
  if(shareBtn) shareBtn.onclick = copyShareLink;
  const shareXBtn = document.getElementById("shareXBtn");
  if(shareXBtn) shareXBtn.onclick = shareOnX;
  const retakeBtn = document.getElementById("retakeBtn");
  if(retakeBtn) retakeBtn.onclick = toggleRetakeBar;
  const cancelRetakeBtn = document.getElementById("cancelRetakeBtn");
  if(cancelRetakeBtn) cancelRetakeBtn.onclick = cancelRetake;
}

function copyShareLink(){
  const url = generateShareURL();
  if(!url) return;
  // Try clipboard API
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(() => {
      showToast("Link copied");
    }).catch(() => {
      showShareBox(url);
    });
  } else {
    showShareBox(url);
  }
}

function showShareBox(url){
  const box = document.getElementById("shareBox");
  if(box){
    box.innerHTML = `<strong>Share link:</strong> <a href="${url}">${url}</a><br><span style="font-size:10px;color:var(--ink-soft)">Copied to clipboard</span>`;
    box.classList.add("show");
  }
}

function shareOnX(){
  const url = generateShareURL();
  if(!url) return;
  const top = state.results[0];
  if(!top) return;
  const text = `I got matched to ${top.club.name} — ${top.pct}%. Take the quiz:`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(xUrl, "_blank");
}

/* ──── Boot ──── */

init();