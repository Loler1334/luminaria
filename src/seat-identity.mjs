// Game events identify a place at the table. Legacy user IDs remain useful
// for authentication and for rows created before the seat backfill.
export function seatForUser(roster, userId) {
  return userId ? roster.find(seat => seat.user_id === userId) : undefined;
}

export function seatForGameRef(roster, participantId, userId) {
  return (participantId && roster.find(seat => seat.id === participantId))
    || seatForUser(roster, userId);
}

export function gameSeatId(roster, participantId, userId) {
  return seatForGameRef(roster, participantId, userId)?.id || participantId || userId || null;
}

export function sameGameSeat(roster, firstParticipantId, firstUserId,
  secondParticipantId, secondUserId) {
  const first = gameSeatId(roster, firstParticipantId, firstUserId);
  const second = gameSeatId(roster, secondParticipantId, secondUserId);
  return first !== null && second !== null && first === second;
}
