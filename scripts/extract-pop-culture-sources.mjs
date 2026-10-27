// Preserve the verified source for cards 201–300 before curating Russian
// scenes, literal keywords and indirect storyteller clues. This does not
// publish raw English art prompts as playable bot semantics.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const sourceDir = new URL('output/cinema-deck-100/', root);
const manifest = JSON.parse(fs.readFileSync(new URL('src/pop-culture-manifest.json', root), 'utf8'));
const destination = new URL('src/pop-culture-201-300-sources.json', root);
const headings = new Map();
const images = new Map();

for (const file of fs.readdirSync(sourceDir).filter(name => name.endsWith('prompts.txt')).sort()) {
  const lines = fs.readFileSync(new URL(`output/cinema-deck-100/${file}`, root), 'utf8').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const heading = /^(\d{1,3})-([A-Za-z][^\r\n]*)$/.exec(line.trim());
    if (heading) {
      if (current) headings.set(current.number, current);
      const number = Number(heading[1]);
      if (headings.has(number) || current?.number === number) throw new Error(`Duplicate prompt ${number}`);
      current = { number, label: heading[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    if (headings.has(current.number)) throw new Error(`Duplicate prompt ${current.number}`);
    headings.set(current.number, current);
  }
}

for (const file of fs.readdirSync(sourceDir).filter(name => /^\d{2,3}-.+\.png$/.test(name))) {
  const number = Number(file.split('-')[0]);
  if (images.has(number)) throw new Error(`Duplicate source image ${number}`);
  images.set(number, file);
}

if (headings.size !== 100 || images.size !== 100) {
  throw new Error(`Expected 100 prompts and images, got ${headings.size} and ${images.size}`);
}

const rows = [];
for (let number = 1; number <= 100; number++) {
  const card = `${number + 200}-pop.webp`;
  const prompt = headings.get(number);
  const image = images.get(number);
  const entry = manifest.find(row => row.card === card);
  if (!prompt || !image || !entry) throw new Error(`Missing source for ${card}`);
  const sourceSha256 = crypto.createHash('sha256')
    .update(fs.readFileSync(new URL(`output/cinema-deck-100/${image}`, root))).digest('hex');
  if (sourceSha256 !== entry.sha256) throw new Error(`Source image hash mismatch for ${card}`);
  const sourcePrompt = prompt.lines.join('\n').trim();
  if (sourcePrompt.length < 100) throw new Error(`Source prompt is too short for ${card}`);
  rows.push({ card, source_sha256: sourceSha256, source_image: image,
    source_label: prompt.label, source_prompt: sourcePrompt });
}

const output = `${JSON.stringify(rows, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== output) throw new Error('Source snapshot is stale');
  console.log('PASS: 100 pop-culture prompts match the original PNG hashes.');
} else {
  fs.writeFileSync(destination, output);
  console.log(`Captured ${rows.length} pop-culture source prompts in ${path.basename(destination.pathname)}`);
}
