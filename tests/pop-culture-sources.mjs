import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('src/pop-culture-manifest.json', 'utf8'));
const sources = JSON.parse(fs.readFileSync('src/pop-culture-201-300-sources.json', 'utf8'));
assert.equal(sources.length, 100);
for (let number = 201; number <= 300; number++) {
  const card = `${number}-pop.webp`;
  const source = sources[number - 201];
  const published = manifest.find(row => row.card === card);
  assert.equal(source.card, card);
  assert.equal(source.source_sha256, published?.sha256);
  assert.ok(source.source_image.endsWith('.png'));
  assert.ok(source.source_label.length >= 3);
  assert.ok(source.source_prompt.length >= 100);
}
assert.ok(sources.every(row => Number(row.card.slice(0, 3)) <= 300));
console.log('PASS: 100 tracked pop-culture prompts map to published cards by SHA-256.');
