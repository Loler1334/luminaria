export function roundOptions(playerCount, cardCount) {
  if (!Number.isInteger(playerCount) || playerCount < 3 || playerCount > 7) return [];
  const maxCycles = Math.floor(cardCount / (playerCount * playerCount));
  return Array.from({length: Math.max(0, maxCycles - 1)}, (_, i) => ({
    cycles: i + 2, rounds: (i + 2) * playerCount, cards: (i + 2) * playerCount * playerCount
  }));
}

export function selectedRoundOption(playerCount, cardCount, cycles = 2) {
  const options = roundOptions(playerCount, cardCount);
  return options.find(option => option.cycles === cycles) || options.at(-1) || null;
}
