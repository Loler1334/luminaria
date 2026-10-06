"""Import the approved 10 trial and 100 follow-up cards into the game."""

import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output' / 'everyday-absurdity'
TRIALS = json.loads((SOURCE / 'trials' / 'index.json').read_text(encoding='utf-8'))
FOLLOW_UP = json.loads((SOURCE / 'cards-manifest.json').read_text(encoding='utf-8'))
assert [row['number'] for row in TRIALS] == list(range(1, 11))
assert [row['number'] for row in FOLLOW_UP] == list(range(11, 111))

manifest = []
for row in TRIALS + FOLLOW_UP:
    number = row['number']
    filename = f'{number:03d}-abs.webp'
    source = SOURCE / ('trials' if number <= 10 else 'cards') / (f'{number:02d}.webp' if number <= 10 else f'{number:03d}.webp')
    with Image.open(source) as original:
        image = original.convert('RGB')
        for folder, size, quality in [('deck-preview', (768, 1152), 82), ('deck-thumbs', (240, 360), 72)]:
            resized = image.copy()
            resized.thumbnail(size, Image.Resampling.LANCZOS)
            resized.save(ROOT / 'public' / folder / filename, 'WEBP', quality=quality, method=6)
    manifest.append({'card': filename, 'title': row['title']})

(ROOT / 'src' / 'everyday-absurdity-manifest.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(manifest)} cards for Everyday Absurdity.')
