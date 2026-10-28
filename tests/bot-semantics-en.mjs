import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const files = fs.readdirSync(new URL('../src/', import.meta.url))
  .filter(file => /^(moonlit-archive|cosmic-absurdity|everyday-absurd|meme-chaos|pop-culture)-.*-semantics\.json$/.test(file));
const cards = files.flatMap(file => JSON.parse(fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')));
const overrides = JSON.parse(fs.readFileSync(new URL('../src/bot-clue-overrides.json', import.meta.url), 'utf8'));
const byCard = new Map(cards.map(card => [card.card, card]));
for (const override of overrides) byCard.set(override.card, { ...byCard.get(override.card), ...override });
assert.equal(byCard.size, 640);
for (const card of byCard.values()) {
  for (const field of ['title_en', 'scene_en', 'keywords_en']) {
    assert(card[field]?.trim() && !/[\u0400-\u04ff]/u.test(card[field]), `${card.card}: ${field}`);
  }
  assert.equal(card.clues_en?.length, 2, `${card.card}: clues_en`);
  assert(card.clues_en.every(clue => clue.trim().length >= 12 && !/[\u0400-\u04ff]/u.test(clue)), card.card);
}
const sql = fs.readFileSync(new URL('../supabase/bot-card-semantics-data.sql', import.meta.url), 'utf8');
assert(sql.includes('title_en, scene_en, keywords_en, clues_en'));
assert(sql.includes("'001-card.webp'"));
assert(sql.includes("'112-card.webp'"));
assert(sql.includes("'001-cos.webp'"));
assert(sql.includes("'110-cos.webp'"));
const strict = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/build-bot-card-semantics.mjs', import.meta.url)), '--require-english'], { encoding: 'utf8' });
assert.equal(strict.status, 0, strict.stderr);
assert(strict.stdout.includes('640 complete in English'));
console.log('PASS: all 640 cards have complete English semantics and regenerate successfully.');
