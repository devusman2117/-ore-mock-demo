// Evidence-based grader. Every awarded mark must cite the candidate's own words.
// Pipeline (same four stages the client markets): Listen -> Converse -> Judge -> Respond.
// Production swap: Judge step becomes an LLM call that must return { awarded, evidenceQuote } per rubric
// item, and we reject any award whose quote is not found verbatim in the transcript.

function matchItem(item, utterances) {
  if (item.any) {
    for (const u of utterances) {
      for (const re of item.any) {
        const m = u.match(re);
        if (m) return [{ text: u, match: m[0] }];
      }
    }
    return null;
  }
  if (item.all) {
    const evidence = [];
    for (const re of item.all) {
      const u = utterances.find((t) => re.test(t));
      if (!u) return null;
      if (!evidence.some((e) => e.text === u)) evidence.push({ text: u, match: u.match(re)[0] });
    }
    return evidence;
  }
  return null;
}

function scoreRubric(rubric, utterances) {
  return rubric.map((item) => {
    const evidence = matchItem(item, utterances);
    return {
      label: item.label,
      domain: item.domain || 'General',
      max: item.marks,
      awarded: evidence ? item.marks : 0,
      evidence: evidence || [],
    };
  });
}

function summarise(items, passMark) {
  const total = items.reduce((s, i) => s + i.awarded, 0);
  const max = items.reduce((s, i) => s + i.max, 0);
  const pct = max ? total / max : 0;

  const domains = {};
  for (const i of items) {
    domains[i.domain] ??= { awarded: 0, max: 0 };
    domains[i.domain].awarded += i.awarded;
    domains[i.domain].max += i.max;
  }

  const missed = items.filter((i) => i.awarded === 0);
  const strengths = Object.entries(domains)
    .filter(([, d]) => d.awarded / d.max >= 0.75)
    .map(([k]) => k);
  const weak = Object.entries(domains)
    .filter(([, d]) => d.awarded / d.max < 0.5)
    .map(([k]) => k);

  const analysis = [
    strengths.length ? `Strong performance in ${strengths.join(', ')}.` : 'No domain reached the 75% "strong" threshold yet.',
    weak.length ? `Priority areas to revise: ${weak.join(', ')}.` : 'No domain fell below 50%. Well balanced.',
    missed.length
      ? `Marks were lost because the transcript contains no evidence of: ${missed.slice(0, 4).map((m) => m.label.toLowerCase()).join('; ')}.`
      : 'Every rubric point was evidenced in your own words.',
  ].join(' ');

  return {
    total,
    max,
    percent: Math.round(pct * 100),
    verdict: pct >= passMark ? 'PASS' : 'FAIL',
    domains,
    analysis,
  };
}

function gradeOsce(station, transcript) {
  const said = transcript.filter((t) => t.from === 'candidate').map((t) => t.text);
  const items = scoreRubric(station.rubric, said);
  return { items, ...summarise(items, station.passMark) };
}

function gradeViva(station, answers) {
  const items = station.questions.flatMap((q, idx) =>
    scoreRubric(q.rubric, answers[idx] ? [answers[idx]] : []).map((i) => ({ ...i, domain: `Q${idx + 1}` }))
  );
  return { items, ...summarise(items, station.passMark) };
}

function gradeLongCase(station, answers) {
  const items = station.phases.flatMap((p, idx) =>
    scoreRubric(p.rubric, answers[idx] ? [answers[idx]] : []).map((i) => ({ ...i, domain: p.title.split(' · ')[1] }))
  );
  return { items, ...summarise(items, station.passMark) };
}

module.exports = { gradeOsce, gradeViva, gradeLongCase };
