import assert from 'node:assert/strict';
import { savedLiveRoom, savedGuestProfile, canReclaimSavedSeat } from '../src/guest-recovery.js';

const values = new Map([
  ['luminaria-last-room', JSON.stringify({ code: 'G5YC9C', recoveryToken: 'a'.repeat(72), player: { name: 'Игрок', avatar: 'mage-male' } })],
  ['luminaria-player', JSON.stringify({ name: 'Игрок', avatar: 'mage-male' })]
]);
const storage = { getItem: key => values.get(key) ?? null };
const saved = savedLiveRoom(storage, 'G5YC9C');

assert.equal(savedLiveRoom(storage, 'OTHER1'), null);
assert.equal(savedGuestProfile(storage).name, 'Игрок');
assert.equal(canReclaimSavedSeat(saved, { code: 'G5YC9C', status: 'lobby' }), true);
assert.equal(canReclaimSavedSeat(saved, { code: 'G5YC9C', status: 'playing' }), true);
assert.equal(canReclaimSavedSeat(saved, { code: 'OTHER1', status: 'lobby' }), false);
values.set('luminaria-last-room', '{broken');
assert.equal(savedLiveRoom(storage, 'G5YC9C'), null);
console.log('PASS: guest seat and profile survive a fresh session, including while the room is in the lobby.');
