import assert from 'node:assert/strict';
import { roundHighlights, bestRoundIndex, visibleRoundCards } from '../src/best-round-card.mjs';

const rounds = [
  { id: 'r1', storyteller_id: 'a', clue: 'Moon' },
  { id: 'r2', storyteller_id: 'a', clue: 'Soup' }
];
const submissions = rounds.flatMap(round => ['a', 'b', 'c', 'd'].map(player_id => ({
  id: `${round.id}-${player_id}`, round_id: round.id, player_id, card_id: `${player_id}.webp`
})));
const votes = [
  { round_id: 'r1', submission_id: 'r1-a', voter_id: 'b' },
  { round_id: 'r1', submission_id: 'r1-a', voter_id: 'c' },
  { round_id: 'r1', submission_id: 'r1-a', voter_id: 'd' },
  { round_id: 'r2', submission_id: 'r2-a', voter_id: 'b' },
  { round_id: 'r2', submission_id: 'r2-c', voter_id: 'c' },
  { round_id: 'r2', submission_id: 'r2-c', voter_id: 'd' }
];
const highlights = roundHighlights(rounds, submissions, votes);
assert.equal(bestRoundIndex(highlights), 1, 'A split vote with a strong trap should beat a unanimous round');
assert.deepEqual(visibleRoundCards(highlights[1]).slice(0, 2).map(card => card.player_id), ['a', 'c']);
assert.equal(highlights[1].correct, 1);
assert.equal(bestRoundIndex([]), -1);
for (const players of [3, 10]) {
  const cards = Array.from({ length: players }, (_, index) => ({ id: `s${index}`, round_id: 'large', player_id: `p${index}` }));
  const ballots = cards.slice(1).map((card, index) => ({ round_id: 'large', submission_id: index % 2 ? 's2' : 's0' }));
  const [highlight] = roundHighlights([{ id: 'large', storyteller_id: 'p0' }], cards, ballots);
  assert.equal(visibleRoundCards(highlight).length, Math.min(players, 4));
  assert.equal(visibleRoundCards(highlight)[0].player_id, 'p0');
}
