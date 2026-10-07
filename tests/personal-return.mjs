import assert from 'node:assert/strict';
import { roomInviteUrl, personalReturnUrl, parsePersonalReturnHash } from '../src/invite-url.js';

const token = '12345678-1234-1234-1234-123456789abc12345678-1234-1234-1234-123456789abc';
const invite = roomInviteUrl('https://luminaria.cc.', 'G5YC9C');
const personal = personalReturnUrl('https://luminaria.cc.', 'G5YC9C', token, { name: 'Друг', avatar: 'mage-female' });
const parsed = new URL(personal);

assert.equal(invite, 'https://luminaria.cc/?room=G5YC9C');
assert.equal(parsed.origin, 'https://luminaria.cc');
assert.equal(parsed.searchParams.get('room'), 'G5YC9C');
assert.equal(parsed.searchParams.has('return'), false);
assert.deepEqual(parsePersonalReturnHash(parsed.hash), { token, name: 'Друг', avatar: 'mage-female' });
assert.equal(parsePersonalReturnHash('#return=wrong'), null);
assert.equal(personalReturnUrl('https://luminaria.cc', 'ABC123', token, { name: 'A', avatar: 'data:image/png;base64,SECRET' }).includes('SECRET'), false);
console.log('PASS: personal return link keeps the secret in the fragment and restores the room/profile.');
