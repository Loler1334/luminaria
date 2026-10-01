"""Import the curated deck, retaining original card IDs for the first hundred."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\rivas\.codex\generated_images\01a0ee3c-d811-73d2-a3c1-85c70e885752')
sources = sorted(SOURCE.glob('*.png'), key=lambda p: (p.stat().st_mtime, p.name))
assert len(sources) == 200, f'Expected 200 selected images, got {len(sources)}'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
originals = {digest(p): f'{200 + int(p.name.split("-")[0])}-pop.webp'
             for p in (ROOT / 'output/cinema-deck-100').glob('*.png')}
manifest = []
next_id = 401
for source in sources:
    sha = digest(source)
    card = originals.get(sha)
    if card is None:
        card = f'{next_id}-pop.webp'
        next_id += 1
        with Image.open(source) as image:
            image = image.convert('RGB')
            for directory, size, quality in [('deck-preview', (768, 1152), 80), ('deck-thumbs', (240, 360), 72)]:
                resized = image.copy()
                resized.thumbnail(size, Image.Resampling.LANCZOS)
                resized.save(ROOT / 'public' / directory / card, 'WEBP', quality=quality, method=6)
    manifest.append({'card': card, 'source': source.name, 'sha256': sha})
manifest.sort(key=lambda row: int(row['card'].split('-')[0]))
assert len({row['card'] for row in manifest}) == 200
assert len({row['sha256'] for row in manifest}) == 200
(ROOT / 'src/pop-culture-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
for directory in ['deck-preview', 'deck-thumbs']:
    total = sum((ROOT / 'public' / directory / row['card']).stat().st_size for row in manifest)
    print(f'{directory}: {total / 1024 / 1024:.2f} MiB for 200 cards')
print(f'Original PNGs: {sum(p.stat().st_size for p in sources) / 1024 / 1024:.2f} MiB')
