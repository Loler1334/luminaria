"""Copy the newly approved fantasy illustrations and build game-sized WebP assets."""
from pathlib import Path
from PIL import Image
import shutil
import sys

root = Path(__file__).resolve().parents[1]
generated = Path(sys.argv[1])
cards = [
    ("103", "shadow-surgeon", "exec-5264daca-7e56-4776-be42-4fbd5c11be45.png"),
    ("104", "bell-diver", "exec-c710dc48-8219-46e3-88d2-6c62bb7a84e2.png"),
    ("105", "feast-of-chairs", "exec-b84706c6-d653-4d29-8a6b-014f2ada1c30.png"),
    ("106", "glass-wolf", "exec-fc8068c5-ea13-4d87-9111-ff5bc0258b31.png"),
    ("107", "blind-sun", "exec-5fad7a52-7e97-443a-9ac9-7a7c82ba3c9c.png"),
    ("108", "staircase-fisher", "exec-a5629e67-99c3-4793-bc79-4a821d5d430e.png"),
    ("109", "sleeping-fortress", "exec-7b439783-3536-4bb6-bf0c-dea1109d4ed7.png"),
    ("110", "mirror-stag", "exec-de4a1515-4bf1-4648-850a-53c1fe59b586.png"),
    ("111", "moth-court", "exec-2f80c249-8fbc-4ede-bb41-20341446afa2.png"),
    ("112", "storm-organ", "exec-a13e80b6-5fd0-484a-a350-a14dca55fd24.png"),
]
candidates = root / "public/deck-candidates/fantasy-anthology"
preview = root / "public/deck-preview"
for number, name, filename in cards:
    source = generated / filename
    original = candidates / f"fantasy-{number}-{name}.png"
    webp = preview / f"{number}-card.webp"
    with Image.open(source) as image:
        image = image.convert("RGB")
        width, height = image.size
        target_ratio = 2 / 3
        if width / height > target_ratio:
            crop_width = round(height * target_ratio)
            left = (width - crop_width) // 2
            image = image.crop((left, 0, left + crop_width, height))
        else:
            crop_height = round(width / target_ratio)
            top = (height - crop_height) // 2
            image = image.crop((0, top, width, top + crop_height))
        image = image.resize((768, 1152), Image.Resampling.LANCZOS)
        image.save(webp, "WEBP", quality=82, method=6)
    shutil.copy2(source, original)
    print(f"{original.name}: {original.stat().st_size:,} B; {webp.name}: {webp.stat().st_size:,} B")
