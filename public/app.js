// Demo frontend: vanilla JS single-page app with hash routing.
// Each view function here becomes a Next.js page (app router) in the production build.

const BRAND = 'DentiPrep AI';
const $app = document.getElementById('app');
let cleanup = null; // timers / speech of the current view

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function avatarSvg(kind, id = '') {
  const skin = kind === 'patient' ? '#f1c7a5' : '#c99772';
  const hair = kind === 'patient' ? '#6b3f22' : '#2f2a33';
  const shirt = kind === 'patient' ? '#7c3aed' : '#1f6f8b';
  const hairShape =
    kind === 'patient'
      ? `<path d="M22 58 C18 22 102 22 98 58 L98 92 C92 70 92 50 60 40 C28 50 28 70 22 92 Z" fill="${hair}"/>`
      : `<path d="M30 46 C32 22 88 22 90 46 C80 36 40 36 30 46 Z" fill="${hair}"/>`;
  return `<svg class="avatar" id="${id}" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="58" fill="var(--tint)"/>
    <path d="M18 120 C22 96 98 96 102 120 Z" fill="${shirt}"/>
    <rect x="52" y="82" width="16" height="16" fill="${skin}"/>
    <ellipse cx="60" cy="60" rx="28" ry="32" fill="${skin}"/>
    ${hairShape}
    <circle cx="49" cy="58" r="3" fill="#221b2b"/><circle cx="71" cy="58" r="3" fill="#221b2b"/>
    ${kind === 'examiner' ? '<rect x="40" y="52" width="18" height="12" rx="3" fill="none" stroke="#221b2b" stroke-width="1.6"/><rect x="62" y="52" width="18" height="12" rx="3" fill="none" stroke="#221b2b" stroke-width="1.6"/><line x1="58" y1="58" x2="62" y2="58" stroke="#221b2b" stroke-width="1.6"/>' : ''}
    <ellipse class="mouth" cx="60" cy="78" rx="7" ry="2.4" fill="#8a3b3b"/>
  </svg>`;
}

// Text-to-speech for the AI persona (production: photoreal lip-synced avatar, e.g. HeyGen / D-ID streaming).
function speak(text, voice, avatarId) {
  const el = document.getElementById(avatarId);
  if (!('speechSynthesis' in window) || !window.__voiceOn) {
    el?.classList.add('talking');
    setTimeout(() => el?.classList.remove('talking'), Math.min(4000, 60 * text.length));
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.pitch = voice?.pitch ?? 1;
  u.rate = voice?.rate ?? 1;
  const gb = speechSynthesis.getVoices().find((v) => v.lang === 'en-GB');
  if (gb) u.voice = gb;
  u.onstart = () => el?.classList.add('talking');
  u.onend = u.onerror = () => el?.classList.remove('talking');
  speechSynthesis.speak(u);
}
window.__voiceOn = true;

// Speech-to-text for the candidate (Chrome / Edge). Production: Deepgram / Whisper streaming STT.
function makeRecognizer(onText) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-GB';
  r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  return r;
}

// Live clock that never pauses, like the real exam.
function startClock(minutes, el, onEnd) {
  let left = minutes * 60;
  el.textContent = fmt(left);
  const id = setInterval(() => {
    left -= 1;
    el.textContent = fmt(Math.max(0, left));
    el.classList.toggle('low', left <= 60);
    if (left <= 0) { clearInterval(id); onEnd(); }
  }, 1000);
  return () => clearInterval(id);
}

// ---------- views ----------
function viewHome() {
  $app.innerHTML = `
  <div class="wrap">
    <div class="hero">
      <div>
        <div class="eyebrow">Independent preparation for the ORE Part 2</div>
        <h1>The regulator won't tell you why you failed. We tell you <em>before you sit.</em></h1>
        <p class="lede">First attempt or final, practise every station out loud with AI patients and examiners, on a real clock, and get a marksheet that shows exactly which words earned each mark.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#/exam/osce-toothache">Try a free mock station →</a>
          <a class="btn btn-ghost" href="#/mocks">See all mocks</a>
        </div>
        <p class="hint" style="margin-top:14px">No card needed · Speak or type · Instant marksheet</p>
      </div>
      <div class="hero-stage">
        <div class="mock-window">
          <div class="bar"><span><span class="live">● LIVE</span> · Station 3 · History taking</span><span>07:42</span></div>
          <div class="faces">
            <div>${avatarSvg('patient', 'hero-p')}<b>Ms Ellis</b><br/>Patient</div>
            <div>${avatarSvg('examiner', 'hero-e')}<b>Dr Blake</b><br/>Examiner</div>
          </div>
          <div class="caption"><span class="muted">Ms Ellis:</span> “Hot drinks make it much worse. Cold water actually helps a bit.”</div>
        </div>
      </div>
    </div>
  </div>

  <section class="block"><div class="wrap">
    <div class="eyebrow">The problem</div>
    <h2>Part 2 is the hardest exam you'll ever prepare for blind.</h2>
    <div class="grid g3" style="margin-top:28px">
      <div class="card"><div class="stat">0</div><h3>Mark schemes released</h3><p class="muted">Mark sheets and model answers stay hidden. A fail comes with no explanation.</p></div>
      <div class="card"><div class="stat">Oral</div><h3>Timed, in person, spoken</h3><p class="muted">It's a performance exam, yet most candidates revise alone from textbooks.</p></div>
      <div class="card"><div class="stat">4</div><h3>Lifetime attempts</h3><p class="muted">Every resit costs thousands in fees plus months of lost associate income.</p></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="eyebrow">How it works</div>
    <h2>An exam hall that's open at 2 a.m.</h2>
    <div class="grid g3" style="margin-top:28px">
      <div class="card"><div class="num">01</div><h3>Pick a mock</h3><p class="muted">A single OSCE station, the medical emergencies viva or the DTP long case.</p></div>
      <div class="card"><div class="num">02</div><h3>Sit it for real</h3><p class="muted">The AI patient only reveals what you actually ask. The clock doesn't stop.</p></div>
      <div class="card"><div class="num">03</div><h3>Read the verdict</h3><p class="muted">Instant marksheet with quoted evidence, plus a written analysis from an ex-examiner.</p></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="eyebrow">Features</div>
    <h2>Built to feel like the real thing.</h2>
    <div class="grid g3" style="margin-top:28px">
      <div class="card"><h3>Gated patient knowledge</h3><p class="muted">Facts like allergies or medical history are only disclosed when you ask the right question.</p></div>
      <div class="card"><h3>Rapid-fire ME viva</h3><p class="muted">8-minute clock with scripted emergency scenarios: drug, dose, route, next step.</p></div>
      <div class="card"><h3>54-minute DTP long case</h3><p class="muted">Four phase-locked stages. Submit a stage and it's sealed, just like the exam.</p></div>
      <div class="card"><h3>Speak or type</h3><p class="muted">Answer out loud with your microphone or type. Both are scored identically.</p></div>
      <div class="card"><h3>Evidence-cited grading</h3><p class="muted">Listen → Converse → Judge → Respond. No mark is awarded without quoting you.</p></div>
      <div class="card"><h3>Contest any verdict</h3><p class="muted">Disagree with a mark? Flag it and a human mentor reviews the transcript.</p></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="eyebrow">Compare</div>
    <h2>Versus a traditional mock day</h2>
    <table class="compare" style="margin-top:24px">
      <tr><th></th><th>Mock day</th><th>${BRAND}</th></tr>
      <tr><td>Price</td><td>£395–475 per day</td><td>From £299, repeatable</td></tr>
      <tr><td>When</td><td>One fixed date and venue</td><td>Any time, from home</td></tr>
      <tr><td>Feedback</td><td>Days later, verbal</td><td>Instant marksheet with quoted evidence</td></tr>
      <tr><td>Retakes</td><td>Book another day</td><td>Sit again tonight</td></tr>
    </table>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="eyebrow">Pricing</div>
    <h2>No pass, no fee.</h2>
    <p class="muted" style="max-width:40em">Sit at least two full mocks and pass at least one. If you then fail the real exam, we refund our fee in full.</p>
    <div class="grid g2" style="margin-top:24px;max-width:820px">
      <div class="card"><h3>Single attempt</h3><div class="price">£299 <small>+VAT</small></div>
        <ul class="ticks"><li>One complete 3-in-1 mock</li><li>OSCE + ME viva + DTP long case</li><li>Instant AI marksheet</li><li>Written examiner analysis in 48h</li></ul>
        <a class="btn btn-ghost" href="#/mocks">Start free</a></div>
      <div class="card featured"><span class="pill">Best value</span><h3 style="margin-top:8px">Two attempts</h3><div class="price">£550 <small>+VAT</small></div>
        <ul class="ticks"><li>Two full sittings with feedback</li><li>Eligible for the refund guarantee</li><li>Progress tracking between sittings</li><li>Contest verdicts to a mentor</li></ul>
        <a class="btn btn-primary" href="#/mocks">Start free</a></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap" style="max-width:800px">
    <div class="eyebrow">FAQ</div>
    <h2>Questions</h2>
    <details class="faq"><summary>Is this affiliated with the regulator?</summary><p>No. It's independent preparation. We don't have access to official mark schemes; our rubrics are written by experienced former examiners.</p></details>
    <details class="faq"><summary>Which parts of Part 2 are covered?</summary><p>The OSCE circuit, the DTP long case and the Medical Emergencies viva. The dental manikin component needs a phantom head, so it isn't covered.</p></details>
    <details class="faq"><summary>Do I have to speak out loud?</summary><p>No. You can type. Spoken and typed answers are graded by exactly the same rubric.</p></details>
    <details class="faq"><summary>Can I delete my data?</summary><p>Yes. One click in "My results" deletes every recording and score. No emails to support.</p></details>
  </div></section>

  <footer><div class="wrap" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <span>${BRAND} · demo build</span>
    <span><a href="#/exam/osce-toothache">Try the demo</a> · <a href="#/academy">For academies</a></span>
  </div></footer>`;
}

async function viewMocks() {
  const list = await api('/stations');
  const label = { osce: 'OSCE station', viva: 'ME viva', longcase: 'Long case' };
  $app.innerHTML = `<div class="wrap" style="padding:40px 20px">
    <div class="eyebrow">Step 1 · Pick a mock</div>
    <h2>Choose what to sit</h2>
    <p class="muted">Each mock runs on a live clock. Your marksheet appears the moment you finish.</p>
    <div class="grid g3 mock-list" style="margin-top:24px">
      ${list.map((s) => `<div class="card">
        <span class="pill">${label[s.type]} · ${s.minutes} min</span>
        <h3 style="margin-top:12px">${esc(s.title)}</h3>
        <p class="muted">${esc(s.brief)}</p>
        <a class="btn btn-primary btn-sm" href="#/exam/${s.id}">Start →</a>
      </div>`).join('')}
    </div>
  </div>`;
}

async function viewExam(stationId) {
  const s = await api(`/stations/${stationId}`);
  const kind = s.type === 'osce' ? 'patient' : 'examiner';

  $app.innerHTML = `<div class="wrap">
    <div class="exam-head">
      <div><span class="pill">${esc(s.subtitle)}</span><h2 style="margin:8px 0 0">${esc(s.title)}</h2></div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="icon-btn" id="voice" title="Toggle persona voice">🔊</button>
        <div class="clock" id="clock">--:--</div>
        <button class="btn btn-ghost btn-sm" id="end">End & mark</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px"><b>Candidate brief.</b> <span class="muted">${esc(s.brief)}</span></div>
    <div class="room">
      <div class="card persona-card">
        ${avatarSvg(kind, 'persona-av')}
        <div class="name">${esc(s.persona.name)}</div>
        <div class="muted" style="font-size:14px">${esc(s.persona.role)}</div>
        <div id="side" style="margin-top:18px;text-align:left"></div>
      </div>
      <div id="stage"></div>
    </div>
  </div>`;

  const { sessionId, opening } = await api('/sessions', { method: 'POST', body: { stationId } });
  let finished = false;
  const stops = [];
  const finish = async (answers) => {
    if (finished) return;
    finished = true;
    stops.forEach((f) => f());
    speechSynthesis?.cancel();
    $app.querySelector('#end').disabled = true;
    toast('Marking your answers…');
    const attempt = await api(`/sessions/${sessionId}/finish`, { method: 'POST', body: { answers } });
    location.hash = `#/result/${attempt.id}`;
  };

  const voiceBtn = document.getElementById('voice');
  voiceBtn.textContent = window.__voiceOn ? '🔊' : '🔇';
  voiceBtn.onclick = () => { window.__voiceOn = !window.__voiceOn; voiceBtn.textContent = window.__voiceOn ? '🔊' : '🔇'; if (!window.__voiceOn) speechSynthesis?.cancel(); };

  let collect = () => [];
  if (s.type === 'osce') collect = runOsce(s, sessionId, opening);
  if (s.type === 'viva') collect = runViva(s, opening, () => finish(collect()));
  if (s.type === 'longcase') collect = runLongCase(s, opening, () => finish(collect()));

  stops.push(startClock(s.minutes, document.getElementById('clock'), () => { toast("Time's up"); finish(collect()); }));
  document.getElementById('end').onclick = () => finish(collect());
  cleanup = () => { stops.forEach((f) => f()); speechSynthesis?.cancel(); };
}

function runOsce(s, sessionId, opening) {
  document.getElementById('side').innerHTML = `
    <div class="hint">Facts uncovered <span id="fact-count" class="mono">0/${s.totalFacts}</span></div>
    <div class="meter"><i id="fact-bar" style="width:0%"></i></div>
    <p class="hint" style="margin-top:12px">The patient only answers what you ask. Try: introduce yourself, ask about the pain, medical history, allergies, then explain your diagnosis and options.</p>`;
  document.getElementById('stage').innerHTML = `<div class="card" style="padding:0">
    <div class="chat" id="chat"></div>
    <form class="composer" id="composer">
      <button type="button" class="icon-btn mic" id="mic" title="Speak your answer">🎤</button>
      <input id="msg" placeholder="Speak or type to ${esc(s.persona.name)}…" autocomplete="off" />
      <button class="btn btn-primary btn-sm">Send</button>
    </form>
  </div>`;

  const chat = document.getElementById('chat');
  const add = (from, text, via) => {
    chat.insertAdjacentHTML('beforeend', `<div class="msg ${from}">${esc(text)}${via ? `<span class="via">${via}</span>` : ''}</div>`);
    chat.scrollTop = chat.scrollHeight;
  };
  add('persona', opening);
  speak(opening, s.persona.voice, 'persona-av');

  const send = async (text, via) => {
    if (!text.trim()) return;
    add('candidate', text, via === 'spoken' ? '🎤 spoken' : '');
    const r = await api(`/sessions/${sessionId}/message`, { method: 'POST', body: { text, via } });
    add('persona', r.reply);
    speak(r.reply, s.persona.voice, 'persona-av');
    document.getElementById('fact-count').textContent = `${r.revealed}/${r.totalFacts}`;
    document.getElementById('fact-bar').style.width = `${(r.revealed / r.totalFacts) * 100}%`;
  };

  const input = document.getElementById('msg');
  document.getElementById('composer').onsubmit = (e) => { e.preventDefault(); const t = input.value; input.value = ''; send(t, 'typed'); };

  const micBtn = document.getElementById('mic');
  const rec = makeRecognizer((text) => send(text, 'spoken'));
  if (!rec) { micBtn.disabled = true; micBtn.title = 'Speech input needs Chrome or Edge'; }
  else {
    rec.onend = () => micBtn.classList.remove('on');
    micBtn.onclick = () => { speechSynthesis?.cancel(); micBtn.classList.add('on'); rec.start(); };
  }
  input.focus();
  return () => [];
}

function runViva(s, opening, onDone) {
  const answers = [];
  let i = 0;
  const stage = document.getElementById('stage');
  document.getElementById('side').innerHTML = `<div class="hint">Question <span id="qn" class="mono">1/${s.questions.length}</span></div><div class="meter"><i id="qbar" style="width:0%"></i></div>`;

  const render = () => {
    if (i >= s.questions.length) return onDone();
    document.getElementById('qn').textContent = `${i + 1}/${s.questions.length}`;
    document.getElementById('qbar').style.width = `${(i / s.questions.length) * 100}%`;
    stage.innerHTML = `<div class="card">
      <div class="num">SCENARIO ${i + 1}</div>
      <h3 style="margin-top:6px">${esc(s.questions[i])}</h3>
      <textarea id="ans" placeholder="Drug, dose, route, next steps… (or press 🎤 and answer out loud)"></textarea>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-ghost btn-sm mic" id="mic">🎤 Speak</button>
        <button class="btn btn-primary btn-sm" id="next">${i === s.questions.length - 1 ? 'Finish viva' : 'Next question →'}</button>
      </div></div>`;
    speak(s.questions[i], s.persona.voice, 'persona-av');
    const ta = document.getElementById('ans');
    ta.focus();
    const micBtn = document.getElementById('mic');
    const rec = makeRecognizer((t) => { ta.value = (ta.value + ' ' + t).trim(); });
    if (!rec) micBtn.disabled = true;
    else { rec.onend = () => micBtn.classList.remove('on'); micBtn.onclick = () => { micBtn.classList.add('on'); rec.start(); }; }
    document.getElementById('next').onclick = () => { answers[i] = ta.value; i += 1; render(); };
  };

  speak(opening, s.persona.voice, 'persona-av');
  setTimeout(render, 50);
  return () => { const ta = document.getElementById('ans'); if (ta && i < s.questions.length) answers[i] = ta.value; return answers; };
}

function runLongCase(s, opening, onDone) {
  const answers = [];
  let current = 0;
  const stage = document.getElementById('stage');
  document.getElementById('side').innerHTML = `<p class="hint">Stages unlock one at a time. Once submitted, a stage is sealed and cannot be edited.</p>`;

  const render = () => {
    stage.innerHTML = `<div class="stages">${s.phases.map((p, idx) => {
      const state = idx < current ? 'done' : idx === current ? 'open' : 'locked';
      return `<div class="stage ${state}">
        <div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(p.title)}</h3><span class="pill ${state === 'done' ? 'pass' : ''}">${state === 'done' ? 'Submitted' : state === 'open' ? 'In progress' : '🔒 Locked'}</span></div>
        ${state === 'locked' ? '' : `<div class="info">${esc(p.info)}</div><b>${esc(p.prompt)}</b>`}
        ${state === 'open' ? `<textarea id="ans" style="margin-top:10px" placeholder="Your answer…"></textarea><button class="btn btn-primary btn-sm" id="submit" style="margin-top:10px">Submit & lock stage</button>` : ''}
        ${state === 'done' ? `<p class="muted" style="margin:10px 0 0;white-space:pre-wrap">${esc(answers[idx] || '(no answer)')}</p>` : ''}
      </div>`;
    }).join('')}</div>`;
    const btn = document.getElementById('submit');
    if (btn) btn.onclick = () => {
      answers[current] = document.getElementById('ans').value;
      current += 1;
      if (current >= s.phases.length) return onDone();
      render();
    };
  };
  speak(opening, s.persona.voice, 'persona-av');
  render();
  return () => { const ta = document.getElementById('ans'); if (ta) answers[current] = ta.value; return answers; };
}

function highlight(text, match) {
  const i = text.toLowerCase().indexOf(match.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + match.length)) + '</mark>' + esc(text.slice(i + match.length));
}

async function viewResult(id) {
  const a = await api(`/attempts/${id}`);
  const r = a.result;
  const pass = r.verdict === 'PASS';
  const C = 2 * Math.PI * 62;
  const spoken = a.transcript.filter((t) => t.via === 'spoken').length;

  $app.innerHTML = `<div class="wrap" style="padding:36px 20px 60px">
    <div class="eyebrow">Marksheet · ${esc(a.stationTitle)} · ${new Date(a.date).toLocaleString()}</div>
    <div class="card verdict">
      <svg class="score-ring" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="62" fill="none" stroke="var(--tint)" stroke-width="14"/>
        <circle cx="75" cy="75" r="62" fill="none" stroke="${pass ? 'var(--pass)' : 'var(--fail)'}" stroke-width="14" stroke-linecap="round"
          stroke-dasharray="${(C * r.percent) / 100} ${C}" transform="rotate(-90 75 75)"/>
        <text x="75" y="80" text-anchor="middle" font-family="var(--serif)" font-size="34" font-weight="600" fill="var(--ink)">${r.percent}%</text>
      </svg>
      <div>
        <span class="pill ${pass ? 'pass' : 'fail'}" style="font-size:14px">${r.verdict}</span>
        <h2 style="margin:10px 0 4px">${r.total} / ${r.max} marks</h2>
        <p class="muted" style="margin:0">Pass mark 60% · Time used ${fmt(a.durationSec)}${spoken ? ` · ${spoken} spoken answers` : ''}</p>
        <div class="pipeline"><span><b>1</b> Listen</span><span><b>2</b> Converse</span><span><b>3</b> Judge</span><span><b>4</b> Respond</span></div>
      </div>
    </div>

    <div class="grid g2" style="margin-top:20px">
      <div class="card"><h3>By domain</h3><div class="bars">
        ${Object.entries(r.domains).map(([k, d]) => `<div class="bar-row"><span>${esc(k)}</span><div class="meter"><i style="width:${(d.awarded / d.max) * 100}%;background:${d.awarded / d.max >= 0.6 ? 'var(--pass)' : 'var(--fail)'}"></i></div><span class="mono">${d.awarded}/${d.max}</span></div>`).join('')}
      </div></div>
      <div class="analysis"><h3>Examiner analysis</h3><p style="margin:0">${esc(r.analysis)}</p>
        <p class="hint" style="margin:12px 0 0">Demo: generated instantly. Production: an ex-examiner reviews the recording and writes this within 48 hours.</p></div>
    </div>

    <div class="card" style="margin-top:20px"><h3>Every mark, with the words that earned it</h3>
      <table class="items">${r.items.map((it) => `<tr class="${it.awarded ? 'got' : 'miss'}">
        <td><b>${esc(it.label)}</b> <span class="muted" style="font-size:12px">· ${esc(it.domain)}</span>
          ${it.awarded ? it.evidence.map((e) => `<div class="evidence">“${highlight(e.text, e.match)}”</div>`).join('') : '<div class="no-evidence">No evidence found in your answers.</div>'}
        </td><td class="mark">${it.awarded}/${it.max}</td></tr>`).join('')}
      </table>
    </div>

    <div class="grid g2" style="margin-top:20px">
      <div class="card"><h3>Transcript</h3><div class="chat" style="max-height:380px;padding:0">
        ${a.transcript.map((t) => `<div class="msg ${t.from}">${esc(t.text)}${t.via === 'spoken' ? '<span class="via">🎤 spoken</span>' : ''}</div>`).join('')}
      </div></div>
      <div class="card"><h3>Disagree with a mark?</h3>
        <div id="contest">${a.contested
          ? `<span class="pill">${esc(a.contested.status)}</span><p class="muted" style="margin-top:10px">“${esc(a.contested.reason)}”</p>`
          : `<p class="muted">Flag it. A human mentor will review your transcript against the rubric.</p>
             <textarea id="reason" placeholder="e.g. I did mention avoiding ibuprofen because of her asthma."></textarea>
             <button class="btn btn-ghost btn-sm" id="contest-btn" style="margin-top:10px">Contest verdict</button>`}
        </div>
        <div class="cta-row"><a class="btn btn-primary" href="#/exam/${a.stationId}">Sit it again</a><a class="btn btn-ghost" href="#/dashboard">All results</a></div>
      </div>
    </div>
  </div>`;

  const btn = document.getElementById('contest-btn');
  if (btn) btn.onclick = async () => {
    const reason = document.getElementById('reason').value.trim();
    if (!reason) return toast('Tell the mentor what you disagree with');
    const c = await api(`/attempts/${id}/contest`, { method: 'POST', body: { reason } });
    document.getElementById('contest').innerHTML = `<span class="pill">${esc(c.status)}</span><p class="muted" style="margin-top:10px">“${esc(c.reason)}”</p>`;
    toast('Sent to mentor review');
  };
}

async function viewDashboard() {
  const list = await api('/attempts');
  const passed = list.filter((a) => a.result.verdict === 'PASS').length;
  const avg = list.length ? Math.round(list.reduce((s, a) => s + a.result.percent, 0) / list.length) : 0;
  const refund = list.length >= 2 && passed >= 1;

  $app.innerHTML = `<div class="wrap" style="padding:40px 20px 60px">
    <div class="eyebrow">My results</div>
    <h2>Your progress</h2>
    <div class="grid g3" style="margin:20px 0">
      <div class="card"><div class="stat">${list.length}</div><div class="muted">Mocks sat</div></div>
      <div class="card"><div class="stat">${avg}%</div><div class="muted">Average score</div></div>
      <div class="card"><div class="stat">${refund ? '✓' : `${Math.min(list.length, 2)}/2`}</div><div class="muted">${refund ? 'Eligible for the no-pass-no-fee refund' : 'Sit 2 mocks and pass 1 to unlock the refund guarantee'}</div></div>
    </div>
    <div class="card">
      ${list.length ? `<table class="items">${list.map((a) => `<tr>
        <td><a href="#/result/${a.id}"><b>${esc(a.stationTitle)}</b></a><div class="muted" style="font-size:13px">${new Date(a.date).toLocaleString()}${a.contested ? ' · contested' : ''}</div></td>
        <td class="mono">${a.result.percent}%</td><td><span class="pill ${a.result.verdict === 'PASS' ? 'pass' : 'fail'}">${a.result.verdict}</span></td></tr>`).join('')}</table>`
        : `<div class="empty">No mocks yet.<br/><br/><a class="btn btn-primary" href="#/mocks">Sit your first mock</a></div>`}
    </div>
    <div style="margin-top:28px"><button class="btn btn-danger btn-sm" id="del">Delete my account & all recordings</button>
      <span class="hint" style="margin-left:10px">One click. No support ticket.</span></div>
  </div>`;

  document.getElementById('del').onclick = async () => {
    if (!confirm('Delete every recording and score? This cannot be undone.')) return;
    await api('/account', { method: 'DELETE' });
    toast('All data deleted');
    viewDashboard();
  };
}

function viewAcademy() {
  const snippet = `<script src="https://app.dentiprep.ai/embed.js"\n        data-academy="smile-academy"\n        data-theme="light"></script>`;
  $app.innerHTML = `<div class="wrap" style="padding:40px 20px 60px;max-width:860px">
    <div class="eyebrow">For dental academies</div>
    <h2>Embed mocks on your own course page</h2>
    <p class="muted">Paste one script tag. Students get a co-branded mock button, and every sign-up is attributed to your academy automatically.</p>
    <div class="code">${esc(snippet)}</div>
    <h3 style="margin-top:32px">Preview on an academy page</h3>
    <div class="card" style="border-style:dashed">
      <div class="muted mono" style="font-size:12px">smile-academy.co.uk/ore-part-2-course</div>
      <h3 style="margin-top:10px">Smile Academy · ORE Part 2 Intensive</h3>
      <p class="muted">Week 4 homework: sit one AI mock station before Thursday's tutorial.</p>
      <a class="btn btn-primary" href="#/exam/osce-toothache?ref=smile-academy">Start mock · powered by ${BRAND}</a>
    </div>
    <div class="grid g3" style="margin-top:24px">
      <div class="card"><h3>Attribution</h3><p class="muted">Sign-ups carry <span class="mono">ref=academy</span> for revenue share.</p></div>
      <div class="card"><h3>Cohort view</h3><p class="muted">Tutors see their students' scores by domain.</p></div>
      <div class="card"><h3>Co-branding</h3><p class="muted">Academy logo and colours on the exam room.</p></div>
    </div>
  </div>`;
}

// ---------- router ----------
async function router() {
  cleanup?.();
  cleanup = null;
  const [, page, param] = location.hash.replace(/\?.*$/, '').split('/');
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (page || 'home')));
  window.scrollTo(0, 0);
  try {
    if (!page) viewHome();
    else if (page === 'mocks') await viewMocks();
    else if (page === 'exam') await viewExam(param);
    else if (page === 'result') await viewResult(param);
    else if (page === 'dashboard') await viewDashboard();
    else if (page === 'academy') viewAcademy();
    else viewHome();
  } catch (err) {
    $app.innerHTML = `<div class="wrap empty"><h3>Something went wrong</h3><p>${esc(err.message)}</p><a class="btn btn-ghost" href="#/">Home</a></div>`;
  }
}

document.getElementById('brand-name').textContent = BRAND;
document.getElementById('theme-toggle').onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
};
window.addEventListener('hashchange', router);
router();
