# K1566 (27S) Done 6: four-panel sheets BASE fill | Q fill | fix fill | fix plain.
#   python make_pics27s.py <capRoot> <outDir>
# Sheets for: the four stub places, every (b) failure, the ten largest (d) places
# (from analyze27s.json). Two rows: surroundings, then close. Width <= 1800.
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27S")
out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else root / "pics")
out_dir.mkdir(parents=True, exist_ok=True)
A = json.loads((root / "analyze27s.json").read_text())

def load(p): return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

targets, seen = [], set()
def add(kind, sc, wx, wy, n):
    k = (sc, round(wx, 2), round(wy, 2))
    if k in seen: return
    seen.add(k); targets.append({"kind": kind, "scene": sc, "world": [wx, wy], "n": n})
for v in A["stubs"]: add("stub", v["scene"], v["world"][0], v["world"][1], v["bnPx"])
for v in A["bFails"]: add("bfail", v["scene"], v["world"][0], v["world"][1], v["n"])
for p in A["dPlaces"][:10]: add("d", p["scene"], p["world"][0], p["world"][1], p["n"])

cache = {}
def imgs(sc):
    if sc not in cache:
        cache[sc] = {"b": load(root / "b1" / sc / "fill.png"), "q": load(root / "q1" / sc / "fill.png"),
                     "n": load(root / "n1" / sc / "fill.png"), "p": load(root / "n1" / sc / "plain.png"),
                     "meta": json.loads((root / "b1" / sc / "meta.json").read_text())}
    return cache[sc]

def crop(arr, box, scale, cap_w):
    x0, y0, x1, y1 = box
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(arr.shape[1], x1); y1 = min(arr.shape[0], y1)
    im = Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1].astype(np.uint8))
    if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    if im.width > cap_w: im = im.resize((cap_w, max(1, round(im.height * cap_w / im.width))), Image.NEAREST)
    return im

lines = []
for idx, t in enumerate(targets):
    I = imgs(t["scene"]); meta = I["meta"]; view = meta.get("view") or {}
    dpr = meta.get("dpr") or 3; s = view.get("s") or 1
    cx = int(round((t["world"][0] * s + (view.get("x") or 0)) * dpr))
    cy = int(round((t["world"][1] * s + (view.get("y") or 0)) * dpr))
    rows = []
    for half, scale in ((90, 1), (26, 3)):
        box = [cx - half, cy - half, cx + half, cy + half]
        tiles = [crop(I[k], box, scale, 430) for k in ("b", "q", "n", "p")]
        h = max(x.height for x in tiles); w = sum(x.width for x in tiles)
        row = Image.new("RGB", (w, h), (0, 0, 0)); xx = 0
        for x in tiles: row.paste(x, (xx, 0)); xx += x.width
        rows.append(row)
    W = max(r.width for r in rows); H = sum(r.height for r in rows)
    sheet = Image.new("RGB", (W, H), (0, 0, 0)); yy = 0
    for r in rows: sheet.paste(r, (0, yy)); yy += r.height
    if sheet.width > 1800: sheet = sheet.resize((1800, max(1, round(sheet.height * 1800 / sheet.width))), Image.NEAREST)
    name = f"{t['scene']}_{t['kind']}_{t['world'][0]:.3f}x{t['world'][1]:.3f}_{t['n']}px.png".replace(":", "_")
    sheet.save(out_dir / name)
    lines.append(f"{t['scene']} {t['world'][0]:.3f}:{t['world'][1]:.3f} kind {t['kind']} changedPx {t['n']} {name}")
    print(lines[-1])
(out_dir / "places.txt").write_text("\n".join(lines) + "\n")
(root / "places.txt").write_text("\n".join(lines) + "\n")
print(f"sheets {len(lines)} in {out_dir}")
