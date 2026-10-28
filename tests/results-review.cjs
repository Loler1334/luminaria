const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const source = fs.readFileSync('src/main.js', 'utf8');
  const route = source.slice(source.indexOf('routeLiveRound=serialRefresh(async function()'), source.indexOf('\nasync function watchLiveRound()'));
  const next = source.slice(source.indexOf('let preparingNextRound=false;'), source.indexOf('\nasync function addLiveScoreboard()'));
  let screen = 'results', nextScreens = 0, handLoads = 0;
  const room = { id: 'room', status: 'playing', awaiting_storyteller: true, current_storyteller_participant_id: 'bot' };
  const state = {
    serialRefresh: fn => fn, liveGameContext: { room: { id: 'room', status: 'playing' } },
    liveGameEpoch: 0, submittingLiveCard: false, resultsReviewPending: true,
    document: { querySelector: selector => selector === '.results-page' && screen === 'results'
      ? {} : selector === 'main' ? { dataset: {} } : null },
    supabase: { from: () => ({ select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: room }), single: async () => ({ data: room }) }) },
    loadLiveDeckProgress: async () => {}, loadLiveRound: async () => null,
    loadLiveHand: async () => { handLoads++; }, isCurrentStoryteller: () => false,
    showLiveRoundWaiting: () => { screen = 'next'; nextScreens++; },
    scheduleBotAdvance: () => {}, liveRoundNumber: 2, liveRoundNumberForId: 'old',
  };
  vm.createContext(state);
  vm.runInContext(`${route}\n${next}`, state);
  await state.routeLiveRound();
  assert.equal(screen, 'results', 'a remote next turn cannot erase results before this player continues');
  assert.equal(handLoads, 0);
  await state.prepareNextLiveRound();
  assert.equal(screen, 'next');
  assert.equal(nextScreens, 1);
  assert.equal(state.resultsReviewPending, false);
  console.log('PASS: results stay visible until this player continues, including when another tab already started the turn.');
})().catch(error => { console.error(error); process.exitCode = 1; });
