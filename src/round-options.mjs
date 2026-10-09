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

export function lobbyRoundChoices(playerCount, cardCount, selectedCycles = 2) {
  const playable = roundOptions(playerCount, cardCount);
  if (playerCount >= 3) return playable;

  // Before the table fills, let the host save a preference. The final playable
  // number of rounds is recalculated once there are enough players to start.
  const maxCycles = Math.max(2, Math.min(6, Math.floor(Math.max(0, cardCount - 1) / 9)));
  const lastCycle = Math.max(maxCycles, selectedCycles);
  return Array.from({ length: lastCycle - 1 }, (_, index) => {
    const cycles = index + 2;
    return { cycles, rounds: cycles * Math.max(1, playerCount), cards: cycles * Math.max(1, playerCount) ** 2 };
  });
}
