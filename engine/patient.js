// Rule-based "AI patient" with gated knowledge.
// The patient only reveals a fact when the candidate asks a question that matches that fact's triggers.
// Production swap: replace respond() with an LLM call (Claude) whose system prompt contains the same
// fact list and the instruction "only disclose a fact when directly asked about it".

function respond(station, message, revealed) {
  const hits = station.facts.filter((f) => f.triggers.some((re) => re.test(message)));

  if (hits.length === 0) {
    const fb = station.fallback;
    return { reply: fb[Math.floor(Math.random() * fb.length)], unlocked: [] };
  }

  // Prefer facts not yet revealed so the patient does not repeat itself; answer at most two per turn.
  const fresh = hits.filter((f) => !revealed.includes(f.id));
  const chosen = (fresh.length ? fresh : hits).slice(0, 2);
  return {
    reply: chosen.map((f) => f.reply).join(' '),
    unlocked: chosen.map((f) => f.id),
  };
}

module.exports = { respond };
