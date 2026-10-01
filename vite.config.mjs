import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const assetCards = readdirSync(new URL('./public/deck-preview/', import.meta.url))
  .filter(name => /^\d+-(card|pop)\.webp$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const popCards = JSON.parse(readFileSync(new URL('./src/pop-culture-manifest.json', import.meta.url), 'utf8')).map(row => row.card);
if (popCards.length !== 200 || new Set(popCards).size !== 200 || popCards.some(card => !assetCards.includes(card))) {
  throw new Error('Pop culture must contain exactly 200 unique, available cards.');
}
const cards = [...assetCards.filter(card => card.endsWith('-card.webp')), ...popCards];

export default defineConfig({
  define: {
    __LUMINARIA_DECK_FILES__: JSON.stringify(cards),
    __LUMINARIA_AVAILABLE_CARDS__: JSON.stringify(assetCards)
  }
});
