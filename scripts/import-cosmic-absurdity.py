"""Import the 110 reviewed Cosmos & UFOs card illustrations into the game."""

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "cosmic-absurdity" / "source"
CARDS = json.loads((ROOT / "docs" / "cosmic-absurdity-110.json").read_text(encoding="utf-8"))[:110]
assert len(CARDS) == 110
assert len({card["title"] for card in CARDS}) == 110
assert len({card["scene"] for card in CARDS}) == 110

hashes = set()
manifest = []
for number, card in enumerate(CARDS, 1):
    source = SOURCE / f"{number:03d}.png"
    if not source.is_file():
        raise FileNotFoundError(f"Missing art for card {number}: {source}")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest in hashes:
        raise ValueError(f"Duplicate illustration for card {number}")
    hashes.add(digest)
    filename = f"{number:03d}-cos.webp"
    with Image.open(source) as original:
        image = original.convert("RGB")
        if image.width < image.height:
            image = image.resize((768, 1152), Image.Resampling.LANCZOS)
        else:
            # Keep portrait framing by center-cropping landscape output.
            target_ratio = 2 / 3
            crop_width = int(image.height * target_ratio)
            left = max(0, (image.width - crop_width) // 2)
            image = image.crop((left, 0, left + crop_width, image.height))
            image = image.resize((768, 1152), Image.Resampling.LANCZOS)
        preview = image.copy()
        preview.thumbnail((768, 1152), Image.Resampling.LANCZOS)
        preview.save(ROOT / "public" / "deck-preview" / filename, "WEBP", quality=82, method=6)
        thumb = image.copy()
        thumb.thumbnail((240, 360), Image.Resampling.LANCZOS)
        thumb.save(ROOT / "public" / "deck-thumbs" / filename, "WEBP", quality=72, method=6)
    manifest.append({"card": filename, "title": card["title"], "scene": card["scene"]})

(ROOT / "src" / "cosmic-absurdity-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Imported {len(manifest)} unique illustrations for Cosmos & UFOs.")
