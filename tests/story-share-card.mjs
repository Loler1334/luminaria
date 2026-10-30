import assert from 'node:assert/strict';
import { storyCardExcerpt, storyCardTextLayout } from '../src/story-share-card.mjs';

assert.equal(storyCardExcerpt('Короткая история.'), 'Короткая история.');
const longStory = 'Сначала звёзды устроили концерт. Потом улитка продала Луне велосипед. '.repeat(12);
const excerpt = storyCardExcerpt(longStory, 160);
assert.ok(excerpt.length <= 161);
assert.ok(excerpt.endsWith('…'));
assert.ok(!excerpt.includes('  '));
for (const story of [longStory, longStory.repeat(4), 'A short ending.']) {
  const layout = storyCardTextLayout(story, value => value.length * 18);
  assert.equal(layout.columns, 1);
  assert.equal(layout.right.length, 0);
  const rendered = [...layout.left, ...layout.right].join(' ');
  assert.equal(rendered, story.replace(/\s+/g, ' ').trim());
  assert.ok(layout.left.every(line => line.length * 18 <= layout.columnWidth));
  assert.ok(layout.right.every(line => line.length * 18 <= layout.columnWidth));
}
console.log('story share excerpt tests passed');
