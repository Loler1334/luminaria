"""Import the approved 110 meme cards from the local review gallery."""

import json
from pathlib import Path
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "deck-candidates" / "meme-chaos"
cards = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
assert [card["number"] for card in cards] == list(range(1, 111))

manifest = []
for card in cards:
    filename = f'{card["number"]:03d}-meme.webp'
    for source_folder, target_folder in (("cards", "deck-preview"), ("thumbs", "deck-thumbs")):
        copyfile(SOURCE / source_folder / f'{card["number"]:03d}.webp', ROOT / "public" / target_folder / filename)
    manifest.append({"card": filename, "title": card["title"], "scene": card["scene"]})

(ROOT / "src" / "meme-chaos-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Imported {len(manifest)} cards for Meme Chaos.")
