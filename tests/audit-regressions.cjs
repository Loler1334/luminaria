const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const source = fs.readFileSync('src/main.js', 'utf8');
  const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  const clue = '"Луна" & <img src=x onerror=alert(1)> &amp;';
  const row = { id: 'r1', room_id: 'room', phase: 'voting', storyteller_id: 'host', clue };
  const query = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle: async () => ({ data: { ...row } }) };
  const state = {
    liveGameContext: { room: { id: 'room', status: 'playing' }, session: { user: { id: 'host' } } },
    liveGameEpoch: 0, liveStarPartyId: 'party', liveRoundNumberForId: 'r1',
    localStorage: { getItem: () => null, removeItem() {} }, nextRoundStorageKey: () => 'pending',
    supabase: { from: () => query }, language: 'ru',
    document: { body: { innerHTML: '' }, querySelectorAll: () => [] },
    availableCards: new Set(), loadLiveRoster: async () => [], votingOrder: rows => rows,
    updateLivePhaseProgress: async () => {}, console
  };
  vm.createContext(state);
  vm.runInContext(source.match(/const escapeHtml=.*;/)[0] + '\n' + extract('async function loadLiveRound(){', 'function syncLiveRoundNumber'), state);
  const loaded = await state.loadLiveRound();
  assert.equal(loaded.clue, clue, 'Loading must preserve the original clue');
  state.supabase = { rpc: async () => ({ data: [], error: null }) };
  state.preloadCardImages = () => {};
  vm.runInContext(extract('async function showLiveVoting(round)', '\nrouteLiveRound='), state);
  await state.showLiveVoting(loaded);
  assert(state.document.body.innerHTML.includes('“&quot;Луна&quot; &amp; &lt;img src=x onerror=alert(1)&gt; &amp;amp;”'));
  assert(!state.document.body.innerHTML.includes('<img src=x'));

  const { handleStory } = await import('../worker/story-service.mjs');
  const { handleIllustration } = await import('../worker/illustration-service.mjs');
  for (const handler of [handleStory, handleIllustration]) {
    for (const body of [null, [], 'text', 42, true, {}]) {
      const response = await handler(new Request('https://test.local/api', {
        method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body)
      }), {}, {}, { fetcher: () => { throw Error('Invalid input must not reach the network'); } });
      assert.equal(response.status, 400);
    }
  }
  console.log('PASS: loaded clues render escaped exactly once; both finale APIs reject invalid JSON shapes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
