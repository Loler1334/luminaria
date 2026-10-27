import assert from 'node:assert/strict';
import fs from 'node:fs';

const curated = JSON.parse(fs.readFileSync('src/moonlit-archive-extra-semantics.json', 'utf8'));
const overrides = JSON.parse(fs.readFileSync('src/bot-clue-overrides.json', 'utf8'));
const pop = ['201-250', '251-300'].flatMap(range =>
  JSON.parse(fs.readFileSync(`src/pop-culture-${range}-semantics.json`, 'utf8')));
const sql = fs.readFileSync('supabase/bot-card-semantics-data.sql', 'utf8');
const ids = new Set(curated.map(card => card.card));
assert.equal(curated.length, 27);
assert.equal(ids.size, 27);
for (let n = 76; n <= 102; n++) {
  const id = `${String(n).padStart(3, '0')}-card.webp`;
  const card = curated.find(entry => entry.card === id);
  assert.ok(card, `Missing visual description for ${id}`);
  assert.ok(card.scene.length > 40 && card.keywords.length > 20);
  assert.ok(card.clues.length >= 2 && card.clues.length <= 3);
  assert.ok(card.clues.every(clue => clue !== card.title));
  assert.ok(sql.includes(`('${id}',`), `Generated SQL omits ${id}`);
  for (const clue of card.clues) assert.ok(sql.includes(clue), `Generated SQL omits clue for ${id}`);
}
const archiveIds = [...sql.matchAll(/\('([0-9]{3}-card\.webp)',/g)].map(match => match[1]);
assert.equal(new Set(archiveIds).size, 110, 'All active Moonlit Archive cards need semantic records');
for (const card of overrides) {
  assert.ok(sql.includes(`('${card.card}',`));
  for (const clue of card.clues) assert.ok(sql.includes(clue));
}
assert.equal(pop.length, 100);
assert.equal(new Set(pop.map(card => card.card)).size, 100);
for (let n = 201; n <= 300; n++) {
  const id = `${n}-pop.webp`;
  const card = pop.find(entry => entry.card === id);
  assert.ok(card, `Missing curated Pop Culture card ${id}`);
  assert.ok(card.scene.length > 40 && card.keywords.length > 30);
  assert.ok(card.clues.length >= 2 && card.clues.length <= 3);
  assert.ok(card.clues.every(clue => clue !== card.title));
  assert.ok(sql.includes(`('${id}',`), `Generated SQL omits ${id}`);
  for (const clue of card.clues) assert.ok(sql.includes(clue), `Generated SQL omits clue for ${id}`);
}
assert.equal([...sql.matchAll(/\('[0-9]{3}-pop\.webp',/g)].length, 100);
console.log('PASS: 110 Moonlit cards and 100 curated Pop Culture cards have semantic records.');
