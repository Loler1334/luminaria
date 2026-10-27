import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const cards = new Map();
for (const deck of ['cosmic-absurdity', 'meme-chaos', 'everyday-absurdity']) {
  const manifest = JSON.parse(fs.readFileSync(new URL(`src/${deck}-manifest.json`, root), 'utf8'));
  for (const card of manifest) cards.set(card.card, { title: card.title, scene: card.scene || '' });
}
const fantasy = new URL('public/deck-candidates/fantasy-anthology/', root);
for (const file of fs.readdirSync(fantasy).sort()) {
  const match = /^fantasy-(\d+)-(.+)\.png$/.exec(file);
  if (!match || /-v\d+$/.test(match[2])) continue;
  const cardId = `${match[1].padStart(3, '0')}-card.webp`;
  if (fs.existsSync(new URL(`public/deck-preview/${cardId}`, root))) {
    cards.set(cardId, { title: match[2].replaceAll('-', ' '), scene: '' });
  }
}
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = [...cards].sort(([a], [b]) => a.localeCompare(b))
  .map(([id, { title, scene }]) => `  (${literal(id)}, ${literal(title)}, ${literal(scene)})`);
const sql = [
  '-- Descriptions of published cards, generated from tracked card manifests and fantasy source filenames.',
  '-- Rebuild with node scripts/build-bot-card-semantics.mjs when those sources change.',
  'begin;',
  "set local lock_timeout = '2s';",
  "set local statement_timeout = '30s';",
  'insert into public.luminaria_bot_card_semantics(card_id, title, scene) values',
  `${rows.join(',\n')}`,
  'on conflict (card_id) do update set title = excluded.title, scene = excluded.scene;',
  'commit;',
  ''
].join('\n');
const destination = new URL('supabase/bot-card-semantics-data.sql', root);
fs.writeFileSync(destination, sql);
console.log(`Wrote ${cards.size} card descriptions to ${path.basename(destination.pathname)}`);
