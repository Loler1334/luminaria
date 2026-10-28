import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const cards = new Map();
for (const deck of ['cosmic-absurdity', 'meme-chaos', 'everyday-absurdity']) {
  const manifest = JSON.parse(fs.readFileSync(new URL(`src/${deck}-manifest.json`, root), 'utf8'));
  for (const card of manifest) cards.set(card.card, { title: card.title, scene: card.scene || '', keywords: '', clues: [] });
}
const memeSemantics = ['001-055', '056-110'].flatMap(range =>
  JSON.parse(fs.readFileSync(new URL(`src/meme-chaos-${range}-semantics.json`, root), 'utf8')));
if (memeSemantics.length !== 110 || new Set(memeSemantics.map(card => card.card)).size !== 110) {
  throw new Error('Expected 110 distinct curated Meme Chaos cards');
}
for (const card of memeSemantics) {
  const existing = cards.get(card.card);
  if (!/^\d{3}-meme\.webp$/.test(card.card)
      || !existing || existing.keywords || existing.clues.length
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || card.scene?.trim().length <= 40 || card.keywords?.trim().length <= 20
      || !Array.isArray(card.clues) || card.clues.length !== 2
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === existing.title.toLowerCase())) {
    throw new Error(`Invalid curated Meme Chaos card: ${card.card}`);
  }
  cards.set(card.card, { ...existing, ...card });
}
const cosmicSemantics = ['001-055', '056-110'].flatMap(range =>
  JSON.parse(fs.readFileSync(new URL(`src/cosmic-absurdity-${range}-semantics.json`, root), 'utf8')));
if (cosmicSemantics.length !== 109 || new Set(cosmicSemantics.map(card => card.card)).size !== 109) {
  throw new Error('Expected 109 distinct curated Cosmic Absurdity cards');
}
for (const card of cosmicSemantics) {
  const existing = cards.get(card.card);
  if (!/^\d{3}-cos\.webp$/.test(card.card) || card.card === '096-cos.webp'
      || !existing || existing.keywords || existing.clues.length
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || card.scene?.trim().length <= 40 || card.keywords?.trim().length <= 20
      || !Array.isArray(card.clues) || card.clues.length !== 2
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === existing.title.toLowerCase())) {
    throw new Error(`Invalid curated Cosmic Absurdity card: ${card.card}`);
  }
  cards.set(card.card, { ...existing, ...card });
}
const everydaySemantics = ['001-055', '056-110'].flatMap(range =>
  JSON.parse(fs.readFileSync(new URL(`src/everyday-absurd-${range}-semantics.json`, root), 'utf8')));
if (everydaySemantics.length !== 110) throw new Error('Expected 110 curated Everyday Absurdity cards');
for (const card of everydaySemantics) {
  const number = Number(card.card.slice(0, 3));
  const existing = cards.get(card.card);
  if (!/^\d{3}-abs\.webp$/.test(card.card) || number < 1 || number > 110
      || !existing || existing.scene || existing.keywords || existing.clues.length
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || !card.scene?.trim() || !card.keywords?.trim()
      || !Array.isArray(card.clues) || card.clues.length !== 2
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === existing.title.toLowerCase())) {
    throw new Error(`Invalid curated Everyday Absurdity card: ${card.card}`);
  }
  cards.set(card.card, { ...existing, ...card });
}
const fantasy = new URL('public/deck-candidates/fantasy-anthology/', root);
for (const file of (fs.existsSync(fantasy) ? fs.readdirSync(fantasy) : []).sort()) {
  const match = /^fantasy-(\d+)-(.+)\.png$/.exec(file);
  if (!match || /-v\d+$/.test(match[2])) continue;
  const cardId = `${match[1].padStart(3, '0')}-card.webp`;
  if (fs.existsSync(new URL(`public/deck-preview/${cardId}`, root))) {
    cards.set(cardId, { title: match[2].replaceAll('-', ' '), scene: '', keywords: '', clues: [] });
  }
}
const moonlitEarly = ['001-050', '051-112'].flatMap(range =>
  JSON.parse(fs.readFileSync(new URL(`src/moonlit-archive-${range}-semantics.json`, root), 'utf8')));
if (moonlitEarly.length !== 83 || new Set(moonlitEarly.map(card => card.card)).size !== 83) {
  throw new Error('Expected 83 distinct curated early Moonlit Archive cards');
}
for (const card of moonlitEarly) {
  const existing = cards.get(card.card);
  if (!/^\d{3}-card\.webp$/.test(card.card)
      || !existing || existing.scene || existing.keywords || existing.clues.length
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || !card.title?.trim() || card.scene?.trim().length <= 40 || card.keywords?.trim().length <= 20
      || !Array.isArray(card.clues) || card.clues.length !== 2
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === card.title.toLowerCase())) {
    throw new Error(`Invalid curated early Moonlit card: ${card.card}`);
  }
  cards.set(card.card, card);
}
const moonlitExtras = JSON.parse(fs.readFileSync(new URL('src/moonlit-archive-extra-semantics.json', root), 'utf8'));
if (moonlitExtras.length !== 27) throw new Error('Expected 27 curated Moonlit Archive cards');
for (const card of moonlitExtras) {
  if (!/^0(?:7[6-9]|[89]\d)-card\.webp$|^10[0-2]-card\.webp$/.test(card.card)
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || cards.has(card.card)
      || !card.title || !card.scene || !card.keywords
      || !Array.isArray(card.clues) || card.clues.length < 2 || card.clues.length > 3
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === card.title.toLowerCase())) {
    throw new Error(`Invalid curated Moonlit card: ${card.card}`);
  }
  cards.set(card.card, card);
}
const popSources = JSON.parse(fs.readFileSync(new URL('src/pop-culture-201-300-sources.json', root), 'utf8'));
const popSourceIds = new Set(popSources.map(source => source.card));
const popSemantics = ['201-250', '251-300', '401-450', '451-500'].flatMap(range =>
  JSON.parse(fs.readFileSync(new URL(`src/pop-culture-${range}-semantics.json`, root), 'utf8')));
if (popSemantics.length !== 200) throw new Error('Expected 200 curated Pop Culture cards');
const publishedPopIds = new Set(JSON.parse(fs.readFileSync(new URL('src/pop-culture-manifest.json', root), 'utf8'))
  .map(entry => entry.card));
for (const card of popSemantics) {
  const number = Number(card.card.slice(0, 3));
  if (!/^\d{3}-pop\.webp$/.test(card.card)
      || !((number >= 201 && number <= 300) || (number >= 401 && number <= 500))
      || !publishedPopIds.has(card.card)
      || (number <= 300 && !popSourceIds.has(card.card))
      || !fs.existsSync(new URL(`public/deck-preview/${card.card}`, root))
      || cards.has(card.card)
      || !card.title?.trim() || !card.scene?.trim() || !card.keywords?.trim()
      || !Array.isArray(card.clues) || card.clues.length < 2 || card.clues.length > 3
      || card.clues.some(clue => !clue.trim() || clue.toLowerCase() === card.title.toLowerCase())) {
    throw new Error(`Invalid curated Pop Culture card: ${card.card}`);
  }
  cards.set(card.card, card);
}
for (const override of JSON.parse(fs.readFileSync(new URL('src/bot-clue-overrides.json', root), 'utf8'))) {
  const existing = cards.get(override.card);
  if (!existing || !override.keywords || !Array.isArray(override.clues)
      || override.clues.length < 2 || override.clues.length > 3
      || override.clues.some(clue => !clue.trim() || clue.toLowerCase() === existing.title.toLowerCase())) {
    throw new Error(`Invalid clue override: ${override.card}`);
  }
  cards.set(override.card, { ...existing, ...override });
}
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const englishFields = ['title_en', 'scene_en', 'keywords_en'];
const hasCyrillic = value => /[\u0400-\u04ff]/u.test(value);
const requireEnglish = process.argv.includes('--require-english');
let englishCount = 0;
for (const [id, card] of cards) {
  const supplied = englishFields.some(field => card[field] !== undefined) || card.clues_en !== undefined;
  if (!supplied) {
    if (requireEnglish) throw new Error(`Missing English semantics: ${id}`);
    continue;
  }
  if (englishFields.some(field => typeof card[field] !== 'string'
      || card[field].trim().length < (field === 'title_en' ? 2 : 20)
      || hasCyrillic(card[field]))) {
    throw new Error(`Incomplete English title, scene or keywords: ${id}`);
  }
  if (!Array.isArray(card.clues_en) || card.clues_en.length < 2
      || card.clues_en.some(clue => typeof clue !== 'string' || clue.trim().length < 12
        || hasCyrillic(clue) || clue.toLowerCase() === card.title_en.toLowerCase())) {
    throw new Error(`Incomplete English clues: ${id}`);
  }
  englishCount++;
}
const rows = [...cards].sort(([a], [b]) => a.localeCompare(b))
  .map(([id, { title, scene, keywords, clues, title_en, scene_en, keywords_en, clues_en }]) => `  (${literal(id)}, ${literal(title)}, ${literal(scene)}, ${literal(keywords)}, ARRAY[${clues.map(literal).join(', ')}]::text[], ${title_en === undefined ? 'NULL' : literal(title_en)}, ${scene_en === undefined ? 'NULL' : literal(scene_en)}, ${keywords_en === undefined ? 'NULL' : literal(keywords_en)}, ${clues_en === undefined ? 'NULL' : `ARRAY[${clues_en.map(literal).join(', ')}]::text[]`})`);
const sql = [
  '-- Descriptions of published cards, generated from tracked card manifests and curated semantics.',
  '-- Rebuild with node scripts/build-bot-card-semantics.mjs when those sources change.',
  'begin;',
  "set local lock_timeout = '2s';",
  "set local statement_timeout = '30s';",
  'insert into public.luminaria_bot_card_semantics(card_id, title, scene, keywords, clues, title_en, scene_en, keywords_en, clues_en) values',
  `${rows.join(',\n')}`,
  'on conflict (card_id) do update set title = excluded.title, scene = excluded.scene, keywords = excluded.keywords, clues = excluded.clues, title_en = excluded.title_en, scene_en = excluded.scene_en, keywords_en = excluded.keywords_en, clues_en = excluded.clues_en;',
  'commit;',
  ''
].join('\n');
const destination = new URL('supabase/bot-card-semantics-data.sql', root);
fs.writeFileSync(destination, sql);
console.log(`Wrote ${cards.size} card descriptions (${englishCount} complete in English) to ${path.basename(destination.pathname)}`);
