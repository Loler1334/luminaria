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

// A public bot seat has no user_id; two bots must never collapse into one
// null-keyed player when revealing owners or voters.
const seats = [
  { id: 'seat-human', user_id: 'human' },
  { id: 'seat-bot-a', user_id: null },
  { id: 'seat-bot-b', user_id: null }
];
const [botHighlight] = roundHighlights(
  [{ id: 'bot-round', storyteller_participant_id: 'seat-bot-a', storyteller_id: null }],
  seats.map(seat => ({ id: `card-${seat.id}`, round_id: 'bot-round', participant_id: seat.id, player_id: seat.user_id })),
  [{ round_id: 'bot-round', submission_id: 'card-seat-bot-a', voter_participant_id: 'seat-human', voter_id: 'human' },
    { round_id: 'bot-round', submission_id: 'card-seat-bot-b', voter_participant_id: 'seat-bot-a', voter_id: null }],
  seats
);
assert.equal(visibleRoundCards(botHighlight)[0].ownerSeatId, 'seat-bot-a');
assert.deepEqual(botHighlight.votes.map(vote => vote.voterSeatId), ['seat-human', 'seat-bot-a']);
const [mixedHighlight] = roundHighlights(
  [{ id: 'mixed', storyteller_participant_id: 'seat-human', storyteller_id: 'human' }],
  [{ id: 'legacy-card', round_id: 'mixed', participant_id: null, player_id: 'human' },
    { id: 'bot-card', round_id: 'mixed', participant_id: 'seat-bot-a', player_id: null }],
  [], seats
);
assert.equal(visibleRoundCards(mixedHighlight)[0].id, 'legacy-card');
assert.equal(highlights[1].correct, 1);
assert.equal(bestRoundIndex([]), -1);
for (const players of [3, 10]) {
  const cards = Array.from({ length: players }, (_, index) => ({ id: `s${index}`, round_id: 'large', player_id: `p${index}` }));
  const ballots = cards.slice(1).map((card, index) => ({ round_id: 'large', submission_id: index % 2 ? 's2' : 's0' }));
  const [highlight] = roundHighlights([{ id: 'large', storyteller_id: 'p0' }], cards, ballots);
  assert.equal(visibleRoundCards(highlight).length, players);
  assert.equal(visibleRoundCards(highlight)[0].player_id, 'p0');
}
