# K1482: 4x tile sheets per site, columns = the given frames (e.g. today | master gf | my gf).
#   python tiles.py <sites.json> <outPrefix> <label=png> [<label=png> ...]  env R=18 (half-size, device px) PER=30 ONLY=j8,t3e
# Each sheet holds PER sites; a site is one row-cell of its frames side by side, labelled with the site name.
import json, os, sys
from PIL import Image, ImageDraw

sites_path, prefix, *frames = sys.argv[1:]
R = int(os.environ.get("R", 18)); PER = int(os.environ.get("PER", 30)); Z = 4
only = [s for s in os.environ.get("ONLY", "").split(",") if s]
S = json.load(open(sites_path))["sites"]
if only:
    by = {s["site"]: s for s in S}
    S = [by[n] for n in only if n in by]
LO, K = float(os.environ.get("LO", 14)), float(os.environ.get("K", 7))  # one fixed level stretch for every frame (the page is dark)
F = [(f.split("=", 1)[0], Image.open(f.split("=", 1)[1]).convert("RGB").point(lambda v: max(0, min(255, round((v - LO) * K))))) for f in frames]
T = 2 * R * Z
cellw = len(F) * (T + 4) + 8
cols = max(1, 1600 // cellw)
os.makedirs(os.path.dirname(prefix) or ".", exist_ok=True)
for page in range(0, len(S), PER):
    chunk = S[page:page + PER]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cellw, rows * (T + 20) + 18), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    d.text((4, 2), " | ".join(l for l, _ in F), fill=(0, 0, 0))
    for i, s in enumerate(chunk):
        cx, cy = round(s["x"]), round(s["y"])
        ox, oy = (i % cols) * cellw, 18 + (i // cols) * (T + 20)
        d.text((ox + 2, oy), s["site"], fill=(200, 0, 0))
        for k, (_, im) in enumerate(F):
            t = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((T, T), Image.NEAREST)
            sheet.paste(t, (ox + k * (T + 4), oy + 12))
    sheet.save(f"{prefix}_{page // PER:02d}.png")
    print(f"{prefix}_{page // PER:02d}.png", len(chunk))
