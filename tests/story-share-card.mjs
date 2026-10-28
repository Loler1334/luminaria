import assert from 'node:assert/strict';
import { storyCardExcerpt } from '../src/story-share-card.mjs';

assert.equal(storyCardExcerpt('Короткая история.'), 'Короткая история.');
const longStory = 'Сначала звёзды устроили концерт. Потом улитка продала Луне велосипед. '.repeat(12);
const excerpt = storyCardExcerpt(longStory, 160);
assert.ok(excerpt.length <= 161);
assert.ok(excerpt.endsWith('…'));
assert.ok(!excerpt.includes('  '));
console.log('story share excerpt tests passed');
