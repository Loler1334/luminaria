import assert from 'node:assert/strict';
import fs from 'node:fs';

const curated = JSON.parse(fs.readFileSync('src/moonlit-archive-extra-semantics.json', 'utf8'));
const earlyMoonlit = ['001-050', '051-112'].flatMap(range =>
  JSON.parse(fs.readFileSync(`src/moonlit-archive-${range}-semantics.json`, 'utf8')));
const everyday = ['001-055', '056-110'].flatMap(range =>
  JSON.parse(fs.readFileSync(`src/everyday-absurd-${range}-semantics.json`, 'utf8')));
const memes = ['001-055', '056-110'].flatMap(range =>
  JSON.parse(fs.readFileSync(`src/meme-chaos-${range}-semantics.json`, 'utf8')));
const overrides = JSON.parse(fs.readFileSync('src/bot-clue-overrides.json', 'utf8'));
const pop = ['201-250', '251-300', '401-450', '451-500'].flatMap(range =>
  JSON.parse(fs.readFileSync(`src/pop-culture-${range}-semantics.json`, 'utf8')));
const sql = fs.readFileSync('supabase/bot-card-semantics-data.sql', 'utf8');
const ids = new Set(curated.map(card => card.card));
const activeArchiveIds = new Set(fs.readdirSync('public/deck-preview').filter(name => /^\d{3}-card\.webp$/.test(name)));
assert.equal(activeArchiveIds.size, 110);
assert.equal(earlyMoonlit.length, 83);
assert.equal(new Set(earlyMoonlit.map(card => card.card)).size, 83);
for (const card of earlyMoonlit) {
  assert.ok(activeArchiveIds.has(card.card), `Unpublished Moonlit card ${card.card}`);
  assert.ok(card.scene.length > 40 && card.keywords.length > 20);
  assert.equal(card.clues.length, 2);
  assert.ok(card.clues.every(clue => clue !== card.title));
  assert.ok(sql.includes(`('${card.card}',`));
  for (const clue of card.clues) assert.ok(sql.includes(clue));
}
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
assert.deepEqual(new Set([...earlyMoonlit, ...curated].map(card => card.card)), activeArchiveIds,
  'All published Moonlit Archive cards need curated semantics');
for (const card of overrides) {
  assert.ok(sql.includes(`('${card.card}',`));
  for (const clue of card.clues) assert.ok(sql.includes(clue));
}
assert.equal(pop.length, 200);
assert.equal(new Set(pop.map(card => card.card)).size, 200);
for (const n of [...Array.from({ length: 100 }, (_, i) => 201 + i), ...Array.from({ length: 100 }, (_, i) => 401 + i)]) {
  const id = `${n}-pop.webp`;
  const card = pop.find(entry => entry.card === id);
  assert.ok(card, `Missing curated Pop Culture card ${id}`);
  assert.ok(card.scene.length > 40 && card.keywords.length > 30);
  assert.ok(card.clues.length >= 2 && card.clues.length <= 3);
  assert.ok(card.clues.every(clue => clue !== card.title));
  assert.ok(sql.includes(`('${id}',`), `Generated SQL omits ${id}`);
  for (const clue of card.clues) assert.ok(sql.includes(clue), `Generated SQL omits clue for ${id}`);
}
assert.equal([...sql.matchAll(/\('[0-9]{3}-pop\.webp',/g)].length, 200);
assert.equal([...sql.matchAll(/^  \('[0-9]{3}-[^']+\.webp',/gm)].length, 640);
assert.equal(memes.length, 110);
assert.equal(new Set(memes.map(card => card.card)).size, 110);
const activeMemeIds = new Set(fs.readdirSync('public/deck-preview').filter(name => /^\d{3}-meme\.webp$/.test(name)));
assert.deepEqual(new Set(memes.map(card => card.card)), activeMemeIds);
for (const card of memes) {
  assert.ok(card.scene.length > 40 && card.keywords.length > 20);
  assert.equal(card.clues.length, 2);
  assert.ok(sql.includes(`('${card.card}',`));
  for (const clue of card.clues) assert.ok(sql.includes(clue));
}
assert.equal(everyday.length, 110);
assert.equal(new Set(everyday.map(card => card.card)).size, 110);
for (let n = 1; n <= 110; n++) {
  const id = `${String(n).padStart(3, '0')}-abs.webp`;
  const card = everyday.find(entry => entry.card === id);
  assert.ok(card, `Missing curated Everyday Absurdity card ${id}`);
  assert.ok(card.scene.length > 40 && card.keywords.length > 20);
  assert.equal(card.clues.length, 2);
  assert.ok(sql.includes(`('${id}',`));
  for (const clue of card.clues) assert.ok(sql.includes(clue));
}
console.log('PASS: 640 active cards, including 110 fully curated Meme Chaos, Moonlit Archive and Everyday Absurdity cards, have semantic records.');
