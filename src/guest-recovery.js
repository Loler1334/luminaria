export function savedLiveRoom(storage, code) {
  try {
    const saved = JSON.parse(storage.getItem('luminaria-last-room') || 'null');
    return saved?.code === code ? saved : null;
  } catch {
    return null;
  }
}

export function savedGuestProfile(storage) {
  try {
    const saved = JSON.parse(storage.getItem('luminaria-player') || 'null');
    return saved?.name ? saved : null;
  } catch {
    return null;
  }
}

export function canReclaimSavedSeat(saved, room) {
  return saved?.code === room.code && typeof saved.recoveryToken === 'string' && saved.recoveryToken.length >= 24;
}
