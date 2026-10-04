// Stateless API shared by the local server (server.js) and the Vercel function (api/index.js).
// The browser holds the live session (transcript, revealed facts) and saved attempts, so nothing
// here needs memory or disk between requests. Production (NestJS) moves that state into Postgres.

const crypto = require('crypto');
const { stations } = require('../engine/stations');
const { respond } = require('../engine/patient');
const { gradeOsce, gradeViva, gradeLongCase } = require('../engine/grader');

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

  ['GET', /^\/api\/stations\/([\w-]+)$/, ([id]) => {
    const s = findStation(id);
    return s ? publicStation(s) : [404, { error: 'Station not found' }];
  }],

  ['POST', /^\/api\/sessions$/, (_, body) => {
    const s = findStation(body.stationId);
    if (!s) return [404, { error: 'Station not found' }];
    return { sessionId: crypto.randomUUID(), opening: s.persona.opening, startedAt: Date.now() };
  }],

  ['POST', /^\/api\/sessions\/([\w-]+)\/message$/, (_, body) => {
    const s = findStation(body.stationId);
    if (!s || s.type !== 'osce') return [404, { error: 'Station not found' }];
    const text = String(body.text || '').trim().slice(0, 1000);
    if (!text) return [400, { error: 'Empty message' }];
    const revealed = Array.isArray(body.revealed) ? body.revealed.slice(0, 100) : [];
    const { reply, unlocked } = respond(s, text, revealed);
    const all = [...new Set([...revealed, ...unlocked])];
    return { reply, unlocked, revealed: all.length, totalFacts: s.facts.length };
  }],

  ['POST', /^\/api\/sessions\/([\w-]+)\/finish$/, (_, body) => {
    const s = findStation(body.stationId);
    if (!s) return [404, { error: 'Station not found' }];
    const answers = (Array.isArray(body.answers) ? body.answers : []).map((a) => String(a || '').slice(0, 4000));
    const sent = Array.isArray(body.transcript) ? body.transcript.slice(0, 400) : [];
    const transcriptIn = sent.map((t) => ({ from: t.from === 'candidate' ? 'candidate' : 'persona', text: String(t.text || '').slice(0, 1000), via: t.via }));

    let result;
    if (s.type === 'osce') result = gradeOsce(s, transcriptIn);
    if (s.type === 'viva') result = gradeViva(s, answers);
    if (s.type === 'longcase') result = gradeLongCase(s, answers);

    const transcript =
      s.type === 'osce'
        ? transcriptIn
        : (s.questions || s.phases).flatMap((x, i) => [
            { from: 'persona', text: x.q || `${x.title}: ${x.prompt}` },
            { from: 'candidate', text: answers[i] || '(no answer)' },
          ]);

    const startedAt = Number(body.startedAt) || Date.now();
    return {
      id: crypto.randomUUID().slice(0, 8),
      stationId: s.id,
      stationTitle: s.title,
      type: s.type,
      date: new Date().toISOString(),
      durationSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
      transcript,
      result,
      contested: null,
    };
  }],
];

// Returns [status, data].
function handle(method, pathname, body = {}) {
  for (const [m, re, fn] of routes) {
    const match = pathname.match(re);
    if (match && m === method) {
      const out = fn(match.slice(1), body);
      return Array.isArray(out) && typeof out[0] === 'number' ? out : [200, out];
    }
  }
  return [404, { error: 'Not found' }];
}

module.exports = { handle };
