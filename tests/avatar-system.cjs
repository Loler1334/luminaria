const assert = require('node:assert/strict');

async function main() {
  const { fantasyAvatars, normalizeAvatar, avatarPortraitMarkup, avatarChoicesMarkup } = await import('../src/avatar-system.mjs');

  assert.equal(fantasyAvatars.length, 9);
  assert.equal(new Set(fantasyAvatars.map(({ id }) => id)).size, fantasyAvatars.length);
  assert.equal(normalizeAvatar('☽'), 'mage-female', 'legacy moon avatar stays recognizable');
  assert.equal(normalizeAvatar('✶'), 'mage-male', 'legacy star avatar stays recognizable');
  assert.equal(normalizeAvatar('goblin'), 'goblin');
  assert.equal(normalizeAvatar('unknown-avatar'), 'mage-male');
  assert.equal(normalizeAvatar('unknown-avatar', 'orc'), 'orc');
  assert.equal(normalizeAvatar('data:image/png;base64,YWJj'), 'data:image/png;base64,YWJj');
  assert.equal(normalizeAvatar('data:image/svg+xml;base64,YWJj'), 'mage-male', 'unsupported image types are rejected');
  assert.match(avatarPortraitMarkup('ent'), /fantasy-avatar--ent/);

  const choices = avatarChoicesMarkup('avatar-choice', 'orc', 'ru');
  assert.equal((choices.match(/data-avatar-id=/g) || []).length, 9);
  assert.match(choices, /class="avatar-choice selected" data-avatar-id="orc"/);
  assert.match(choices, /aria-label="Волшебница"/);
  assert.match(choices, /aria-label="Гоблин"/);

  console.log('avatar system tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
