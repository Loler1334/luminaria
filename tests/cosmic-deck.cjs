const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const concepts = JSON.parse(fs.readFileSync(path.join(root, 'docs/cosmic-absurdity-110.json'), 'utf8')).slice(0, 110);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/cosmic-absurdity-manifest.json'), 'utf8'));
assert.equal(concepts.length, 110);
assert.equal(manifest.length, 110);
assert.equal(new Set(concepts.map(card => card.title)).size, 110, 'card titles must be unique');
assert.equal(new Set(concepts.map(card => card.scene)).size, 110, 'card scenes must be unique');
for (const [index, card] of manifest.entries()) {
  const number = String(index + 1).padStart(3, '0');
  assert.equal(card.card, `${number}-cos.webp`);
  assert.equal(card.title, concepts[index].title);
  assert.equal(card.scene, concepts[index].scene);
  assert(fs.existsSync(path.join(root, 'public/deck-preview', card.card)), `missing preview: ${card.card}`);
  assert(fs.existsSync(path.join(root, 'public/deck-thumbs', card.card)), `missing thumbnail: ${card.card}`);
}
console.log('PASS: Cosmos & UFOs has 110 unique scenes with a preview and thumbnail for each card.');
