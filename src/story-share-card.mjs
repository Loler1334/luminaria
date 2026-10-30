export function storyCardExcerpt(story, limit = 240) {
  const text = String(story || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const opening = text.slice(0, limit);
  const sentence = Math.max(opening.lastIndexOf('. '), opening.lastIndexOf('! '), opening.lastIndexOf('? '));
  return `${(sentence > limit * 0.45 ? opening.slice(0, sentence + 1) : opening.slice(0, opening.lastIndexOf(' '))).trim()}…`;
}

// Measure before creating the canvas: its height must include every line of the
// canonical story, including the ending of older, longer saved stories.
export function storyCardTextLayout(story, measure, maxWidth = 936) {
  const text = String(story || '').replace(/\s+/g, ' ').trim();
  const columns = 1;
  const fontSize = text.length > 1400 ? 34 : 38;
  const lineHeight = fontSize === 34 ? 47 : 50;
  const columnWidth = maxWidth;
  const words = text.split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, fontSize) > columnWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return { columns, columnWidth, fontSize, lineHeight, left: lines, right: [] };
}
