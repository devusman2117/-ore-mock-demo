// Demo backend. Plain Node http, zero dependencies.
// Each route here maps 1:1 to a NestJS controller in the production build (see DEMO_GUIDE.md).

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { stations } = require('./engine/stations');
const { respond } = require('./engine/patient');
const { gradeOsce, gradeViva, gradeLongCase } = require('./engine/grader');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'attempts.json');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const sessions = new Map(); // live exams in memory
const db = { attempts: fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : [] };
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db.attempts, null, 2));

const findStation = (id) => stations.find((s) => s.id === id);

// Never send rubrics or hidden patient facts to the browser.
function publicStation(s) {
  const base = { id: s.id, type: s.type, title: s.title, subtitle: s.subtitle, minutes: s.minutes, persona: s.persona, brief: s.brief };
  if (s.type === 'osce') base.totalFacts = s.facts.length;
  if (s.type === 'viva') base.questions = s.questions.map((q) => q.q);
  if (s.type === 'longcase') base.phases = s.phases.map(({ title, info, prompt }) => ({ title, info, prompt }));
  return base;
}

const routes = [
  ['GET', /^\/api\/stations$/, () => stations.map(publicStation)],

  ['GET', /^\/api\/stations\/([\w-]+)$/, (req, [id]) => {
    const s = findStation(id);
    return s ? publicStation(s) : [404, { error: 'Station not found' }];
  }],

  ['POST', /^\/api\/sessions$/, (req, _, body) => {
    const s = findStation(body.stationId);
    if (!s) return [404, { error: 'Station not found' }];
    const id = crypto.randomUUID();
    sessions.set(id, { id, stationId: s.id, startedAt: Date.now(), transcript: [{ from: 'persona', text: s.persona.opening, t: 0 }], revealed: [] });
    return { sessionId: id, opening: s.persona.opening };
  }],

  ['POST', /^\/api\/sessions\/([\w-]+)\/message$/, (req, [id], body) => {
    const sess = sessions.get(id);
    if (!sess) return [404, { error: 'Session not found' }];
    const s = findStation(sess.stationId);
    const t = Math.round((Date.now() - sess.startedAt) / 1000);
    const text = String(body.text || '').trim().slice(0, 1000);
    if (!text) return [400, { error: 'Empty message' }];

    sess.transcript.push({ from: 'candidate', text, t, via: body.via || 'typed' });
    const { reply, unlocked } = respond(s, text, sess.revealed);
    for (const u of unlocked) if (!sess.revealed.includes(u)) sess.revealed.push(u);
    sess.transcript.push({ from: 'persona', text: reply, t });
    return { reply, unlocked, revealed: sess.revealed.length, totalFacts: s.facts.length };
  }],

  ['POST', /^\/api\/sessions\/([\w-]+)\/finish$/, (req, [id], body) => {
    const sess = sessions.get(id);
    if (!sess) return [404, { error: 'Session not found' }];
    const s = findStation(sess.stationId);
    const answers = body.answers || [];

    let result;
    if (s.type === 'osce') result = gradeOsce(s, sess.transcript);
    if (s.type === 'viva') result = gradeViva(s, answers);
    if (s.type === 'longcase') result = gradeLongCase(s, answers);

    const transcript =
      s.type === 'osce'
        ? sess.transcript
        : (s.questions || s.phases).flatMap((x, i) => [
            { from: 'persona', text: x.q || `${x.title}: ${x.prompt}` },
            { from: 'candidate', text: answers[i] || '(no answer)' },
          ]);

    const attempt = {
      id: crypto.randomUUID().slice(0, 8),
      stationId: s.id,
      stationTitle: s.title,
      type: s.type,
      date: new Date().toISOString(),
      durationSec: Math.round((Date.now() - sess.startedAt) / 1000),
      transcript,
      result,
      contested: null,
    };
    db.attempts.unshift(attempt);
    save();
    sessions.delete(id);
    return attempt;
  }],

  ['GET', /^\/api\/attempts$/, () => db.attempts.map(({ transcript, ...a }) => ({ ...a, result: { percent: a.result.percent, verdict: a.result.verdict } }))],

  ['GET', /^\/api\/attempts\/([\w-]+)$/, (req, [id]) => db.attempts.find((a) => a.id === id) || [404, { error: 'Attempt not found' }]],

  // "Contestable verdicts": candidate disagrees, attempt is queued for a human mentor.
  ['POST', /^\/api\/attempts\/([\w-]+)\/contest$/, (req, [id], body) => {
    const a = db.attempts.find((x) => x.id === id);
    if (!a) return [404, { error: 'Attempt not found' }];
    a.contested = { reason: String(body.reason || '').slice(0, 500), status: 'Queued for mentor review', at: new Date().toISOString() };
    save();
    return a.contested;
  }],

  // One-click account deletion: wipes every recording and score.
  ['DELETE', /^\/api\/account$/, () => {
    db.attempts = [];
    save();
    return { deleted: true };
  }],
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (url.pathname.startsWith('/api/')) {
    let body = {};
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      try { body = raw ? JSON.parse(raw) : {}; } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    }
    for (const [method, re, handler] of routes) {
      const m = url.pathname.match(re);
      if (m && method === req.method) {
        const out = handler(req, m.slice(1), body);
        return Array.isArray(out) && typeof out[0] === 'number' ? send(res, out[0], out[1]) : send(res, 200, out);
      }
    }
    return send(res, 404, { error: 'Not found' });
  }

  // Static files; unknown paths fall back to the SPA shell.
  let file = path.join(PUBLIC, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Demo running at http://localhost:${PORT}`));
