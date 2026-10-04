export function roundOptions(playerCount, cardCount) {
  if (!Number.isInteger(playerCount) || playerCount < 3 || playerCount > 10) return [];
  const firstCycles = playerCount >= 7 ? 1 : 2;
  const availableCards = cardCount - playerCount;
  const maxCycles = Math.floor(availableCards / (playerCount * playerCount));
  return Array.from({length: Math.max(0, maxCycles - firstCycles + 1)}, (_, i) => ({
    cycles: i + firstCycles, rounds: (i + firstCycles) * playerCount, cards: (i + firstCycles) * playerCount * playerCount
  }));
}

export function selectedRoundOption(playerCount, cardCount, cycles = 2) {
  const options = roundOptions(playerCount, cardCount);
  return options.find(option => option.cycles === cycles) || options.at(-1) || null;
}
