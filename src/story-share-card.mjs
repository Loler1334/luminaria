export function storyCardExcerpt(story, limit = 240) {
  const text = String(story || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const opening = text.slice(0, limit);
  const sentence = Math.max(opening.lastIndexOf('. '), opening.lastIndexOf('! '), opening.lastIndexOf('? '));
  return `${(sentence > limit * 0.45 ? opening.slice(0, sentence + 1) : opening.slice(0, opening.lastIndexOf(' '))).trim()}…`;
}
