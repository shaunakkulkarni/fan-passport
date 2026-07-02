/* ============================================================
   Fan Passport — App Logic v1
   Loads clubs from clubs.json, handles quiz, matching,
   persistence (localStorage), shareable URLs, retake flow,
   and lightweight analytics.
   ============================================================ */

let CLUBS = [];
let QUESTIONS = [];
let TAG_LABEL = {};

const LEAGUE_ORDER = ["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","MLS","Liga MX"];

let state = {
  view: "home",
  qIndex: 0,
  answers: [],  // array of option indices, one per question
  results: [],  // top 3 match results
  currentClub: null,
  sharedResult: null,  // decoded from URL if present
  retakeMode: false,   // true when user jumped from results to edit one answer
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
    TAG_LABEL = quizData.tag_labels;
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

/* ──── Matching Algorithm ──── */

function computeResults(answers){
  // Build profile from quiz answers
  const profile = {};
  answers.forEach((optIdx, qIdx) => {
    const opt = QUESTIONS[qIdx].options[optIdx];
    if(!opt) return;
    Object.entries(opt.w).forEach(([tag, val]) => {
      profile[tag] = (profile[tag] || 0) + val;
    });
  });

  // Score each club
  const scored = CLUBS.map(club => {
    let score = 0;
    const contributions = [];
    Object.entries(profile).forEach(([tag, val]) => {
      const clubVal = club.tags[tag] || 0;
      const contrib = val * clubVal;
      if(contrib > 0) contributions.push({tag, contrib});
      score += contrib;
    });
    contributions.sort((a,b) => b.contrib - a.contrib);
    return { club, score, topTags: contributions.slice(0,3).map(c => c.tag) };
  });

  scored.sort((a,b) => b.score - a.score);
  const maxScore = scored[0].score || 1;
  return scored.slice(0, 3).map(s => ({
    club: s.club,
    pct: Math.round((s.score / maxScore) * 100),
    topTags: s.topTags,
  }));
}

/* ──── Quiz Flow ──── */

function startQuiz(){
  state.qIndex = 0;
  state.answers = [];
  state.results = [];
  state.sharedResult = null;
  state.retakeMode = false;
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
  const options = q.options.map((opt, i) => `
    <div class="option ${selected === i ? 'selected' : ''}" data-select="${i}">
      <div class="letter">${String.fromCharCode(65 + i)}</div>
      <div class="otext"><strong>${opt.label}</strong><span>${opt.text}</span></div>
    </div>
  `).join("");
  const isLast = state.qIndex === QUESTIONS.length - 1;
  const nextLabel = isLast ? 'Stamp my passport →' : 'Next →';
  const nextDisabled = selected === undefined;

  // In retake mode, show a different nav: cancel goes back to results
  let navHTML;
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
        <h2>${q.q}</h2>
        <div class="qsub">${q.sub}</div>
        <div class="options">${options}</div>
        ${navHTML}
      </div>
    </div>
  </section>`;
}

function renderResult(){
  if(!state.results.length) return renderHome();
  const top = state.results[0];
  const runners = state.results.slice(1);
  const isShared = state.sharedResult && state.sharedResult.isShared;
  const chips = top.topTags.map(t => `<span class="why-chip">${TAG_LABEL[t] || t}</span>`).join("");
  const runnerCards = runners.map(r => `
    <div class="runner-card" data-open="${r.club.id}">
      <div class="runner-crest" style="background:${r.club.c1}">${initials(r.club.name)}</div>
      <div>
        <div class="rname">${r.club.name}</div>
        <div class="rleague">${r.club.league} · ${r.pct}% match</div>
      </div>
    </div>
  `).join("");

  // Retake chips: one per answered question
  const retakeChips = state.answers.map((ans, i) => {
    const q = QUESTIONS[i];
    const label = q.options[ans] ? q.options[ans].label : "—";
    return `<div class="retake-chip" data-jump="${i}">Q${i+1}: ${label}</div>`;
  }).join("");

  const sharedNote = isShared ? `<div class="why-chip" style="border-color:var(--visa-red);color:var(--visa-red)">Shared result</div>` : "";

  // Update OG meta tags for this specific club result
  updateOGMeta(top.club);

  return `
  <section class="result-shell">
    <div class="wrap">
      <div class="result-top">
        <div class="crest" style="background:${top.club.c1}">${initials(top.club.name)}</div>
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
        <button class="btn secondary" id="retakeBtn">Quick retake</button>
        <button class="btn secondary" data-nav="quiz">Full retake</button>
        <button class="btn secondary" data-nav="browse">Browse all clubs</button>
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
    </div>
  </section>`;
}

function renderDossier(){
  const c = state.currentClub;
  if(!c) return renderBrowse();
  const tagList = Object.keys(c.tags).slice(0, 6).map(t =>
    `<span>${TAG_LABEL[t] || t}</span>`
  ).join("");
  return `
  <section class="dossier-band" style="background:${c.c1}">
    <div class="wrap">
      <div class="dossier-crest" style="background:${c.c2};color:${c.c1}">${initials(c.name)}</div>
      <div>
        <div class="dname display">${c.name}</div>
        <div class="dmeta">${c.nick} · ${c.league}, ${c.country} · Founded ${c.founded}</div>
      </div>
    </div>
  </section>
  <section class="dossier-body">
    <div class="wrap">
      <span class="back-link" data-nav="browse">← Back to directory</span>
      <div class="field">
        <div class="flabel">Identity</div>
        <div class="fval serif">${c.identity}</div>
      </div>
      <div class="field">
        <div class="flabel">Home ground</div>
        <div class="fval">${c.stadium}</div>
      </div>
      <div class="field">
        <div class="flabel">Honours</div>
        <div class="fval">${c.honours}</div>
      </div>
      <div class="field">
        <div class="flabel">History</div>
        <div class="fval">${c.history}</div>
      </div>
      <div class="field">
        <div class="flabel">Rivals</div>
        <div class="fval">${c.rivals.map(r => `• ${r}`).join("<br>")}</div>
      </div>
      <div class="field">
        <div class="flabel">Legends</div>
        <div class="fval">${c.legends.join(" · ")}</div>
      </div>
      <div class="field">
        <div class="flabel">What to watch for</div>
        <div class="fval">${c.watch}</div>
      </div>
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
        <div class="club-crest-sm" style="background:${c.c1}">${initials(c.name)}</div>
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

/* ──── Helpers ──── */

function updateOGMeta(club){
  // Dynamically update OG/twitter meta tags for the current club result.
  // NOTE: Most social scrapers (Facebook, Twitter/X, Slack, iMessage) read
  // OG tags server-side and do NOT execute JavaScript. So this dynamic update
  // only works for platforms that re-read meta tags after page load (rare)
  // or for browser-native share sheets. The primary mechanism for correct
  // share previews is the static per-club OG images in /og/<club-id>.png,
  // combined with a server/edge function (not implemented in this static build)
  // that serves the right og:image based on the ?r= param. For now, the static
  // generic og-share-card.png remains the default for the root URL.
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

function attachHandlers(){
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
  const nextBtn = document.getElementById("nextBtn");
  if(nextBtn) nextBtn.onclick = nextQuestion;
  const prevBtn = document.getElementById("prevBtn");
  if(prevBtn) prevBtn.onclick = prevQuestion;

  const shareBtn = document.getElementById("shareBtn");
  if(shareBtn) shareBtn.onclick = copyShareLink;
  const retakeBtn = document.getElementById("retakeBtn");
  if(retakeBtn) retakeBtn.onclick = toggleRetakeBar;
  const cancelRetakeBtn = document.getElementById("cancelRetakeBtn");
  if(cancelRetakeBtn) cancelRetakeBtn.onclick = cancelRetake;
}

function copyShareLink(){
  const url = generateShareURL();
  if(!url) return;
  const box = document.getElementById("shareBox");
  box.innerHTML = `<strong>Share link:</strong> <a href="${url}">${url}</a><br><span style="font-size:10px;color:var(--ink-soft)">Copied to clipboard</span>`;
  box.classList.add("show");
  // Try clipboard API
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).catch(() => {});
  }
}

/* ──── Boot ──── */

init();