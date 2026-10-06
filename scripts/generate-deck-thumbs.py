"""Create missing lightweight gallery thumbnails for the playable card deck."""
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PREVIEW_DIR = ROOT / "public" / "deck-preview"
THUMB_DIR = ROOT / "public" / "deck-thumbs"
THUMB_DIR.mkdir(parents=True, exist_ok=True)

created = 0
for source in sorted(PREVIEW_DIR.glob("*-card.webp")):
    target = THUMB_DIR / source.name
    if target.exists():
        continue

    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((240, 360), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=72, method=6)
    created += 1

print(f"Created {created} thumbnails; {len(list(PREVIEW_DIR.glob('*-card.webp')))} playable cards checked.")
