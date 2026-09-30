import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';

// Newly published card assets automatically expand their deck and round limits.
const cards = readdirSync(new URL('./public/deck-preview/', import.meta.url))
  .filter(name => /^\d+-(card|pop)\.webp$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

export default defineConfig({
  define: { __LUMINARIA_DECK_FILES__: JSON.stringify(cards) }
});
