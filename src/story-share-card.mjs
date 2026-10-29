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
  const columns = text.length > 900 ? 2 : 1;
  const fontSize = columns === 2 ? 32 : 38;
  const lineHeight = columns === 2 ? 44 : 50;
  const columnWidth = columns === 2 ? Math.floor((maxWidth - 36) / 2) : maxWidth;
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
  const split = columns === 2 ? Math.ceil(lines.length / 2) : lines.length;
  return { columns, columnWidth, fontSize, lineHeight, left: lines.slice(0, split), right: lines.slice(split) };
}
