// Stable within a round, independent of submission time and database row order.
export function votingOrder(submissions, roundId) {
  let seed = 2166136261;
  for (const char of roundId) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const cards = [...submissions].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = cards.length - 1; i > 0; i--) {
    seed += 0x6D2B79F5;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    const j = Math.floor(((value ^ value >>> 14) >>> 0) / 4294967296 * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Coalesce Realtime and polling refreshes; never render two phases concurrently.
export function serialRefresh(refresh) {
  let running = null, pending = false;
  return function request() {
    pending = true;
    if (!running) running = (async () => {
      try { while (pending) { pending = false; await refresh(); } }
      finally { running = null; }
    })();
    return running;
  };
}
