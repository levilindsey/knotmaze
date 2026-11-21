# K1566 (27R) Done 5: four-panel sheets BASE fill | Q fill | narrow fill | narrow plain.
#   python make_pics27r.py <capRoot> <outDir>
# Places: BASE-narrow fill places (diff27r.json places) plus each with-counter place of (d)
# (diff27r.json d) with no BASE-narrow place within 0.35 world (sheet centred on its world).
# Each sheet: two rows (surroundings at 1x, close enlarged), four panels of the same crop,
# total width <= 1800. places.txt: scene, world x:y, BASE-narrow px, Q-narrow px in box, sheet.
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27R")
out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else root / "pics27r")
out_dir.mkdir(parents=True, exist_ok=True)
data = json.loads((root / "diff27r.json").read_text())
bn = data["places"]; dlist = data["d"]
tol = 0.35

def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

def changed(a, b):
    return np.any(a != b, axis=2)

# union places: bn entries get qn count from matching d (same scene, centre within tol: use d box count of nearest)
places = []
for p in bn:
    # Q-narrow px in this place's box, from current session (computed in main loop below as approx via d match)
    places.append({"scene": p["scene"], "world": p["world"], "bboxDev": p["bboxDev"], "n": p["n"], "kind": "bn"})
for d in dlist:
    if any(p["scene"] == d["scene"] and abs(p["world"][0] - d["world"][0]) < tol and abs(p["world"][1] - d["world"][1]) < tol for p in bn):
        continue
    places.append({"scene": d["scene"], "world": d["world"], "bboxDev": d["bboxDev"], "n": 0, "kind": "d", "nQ": d["nQ"]})
places.sort(key=lambda p: (p["scene"], -p["n"]))

# per-scene image cache
cache = {}
def imgs(sc):
    if sc not in cache:
        cache[sc] = {
            "b": load(root / "b1" / sc / "fill.png"), "q": load(root / "q1" / sc / "fill.png"),
            "n": load(root / "n1" / sc / "fill.png"), "p": load(root / "n1" / sc / "plain.png"),
            "meta": json.loads((root / "b1" / sc / "meta.json").read_text()),
        }
    return cache[sc]

def crop_img(arr, box, scale, cap_w):
    x0, y0, x1, y1 = box
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(arr.shape[1], x1); y1 = min(arr.shape[0], y1)
    im = Image.fromarray(arr[y0:y1 + 1, x0:x1 + 1].astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    if im.width > cap_w:
        im = im.resize((cap_w, max(1, round(im.height * cap_w / im.width))), Image.NEAREST)
    return im

lines = []
for idx, p in enumerate(places):
    sc = p["scene"]; I = imgs(sc)
    x0, y0, x1, y1 = p["bboxDev"]
    # Q-narrow differing px inside the (padded) box
    qn = changed(I["q"], I["n"])
    bx0, by0 = max(0, x0 - 2), max(0, y0 - 2); bx1, by1 = min(qn.shape[1] - 1, x1 + 2), min(qn.shape[0] - 1, y1 + 2)
    qn_in = int(qn[by0:by1 + 1, bx0:bx1 + 1].sum())
    sur = [x0 - 90, y0 - 90, x1 + 90, y1 + 90]
    close = [x0 - 14, y0 - 14, x1 + 14, y1 + 14]
    # close scale: fit tile to <=430 wide
    cw = max(1, close[2] - close[0] + 1)
    scale = max(1, min(4, 430 // max(1, cw)))
    rows = []
    for box, sc_scale, cap in ((sur, 1, 430), (close, scale, 430)):
        tiles = [crop_img(I[k], box, sc_scale, cap) for k in ("b", "q", "n", "p")]
        h = max(t.height for t in tiles)
        # pad tiles to same height
        padded = []
        for t in tiles:
            if t.height < h:
                nt = Image.new("RGB", (t.width, h), (0, 0, 0)); nt.paste(t, (0, 0)); padded.append(nt)
            else:
                padded.append(t)
        w = sum(t.width for t in padded)
        row = Image.new("RGB", (w, h), (0, 0, 0))
        xx = 0
        for t in padded:
            row.paste(t, (xx, 0)); xx += t.width
        rows.append(row)
    W = max(r.width for r in rows); H = sum(r.height for r in rows)
    sheet = Image.new("RGB", (W, H), (0, 0, 0))
    yy = 0
    for r in rows:
        sheet.paste(r, (0, yy)); yy += r.height
    if sheet.width > 1800:
        sheet = sheet.resize((1800, max(1, round(sheet.height * 1800 / sheet.width))), Image.NEAREST)
    name = f"{sc}_p{idx:03d}_{p['n']}px.png"
    sheet.save(out_dir / name)
    lines.append(f"{sc} {p['world'][0]:.3f}:{p['world'][1]:.3f} bn {p['n']} qnInBox {qn_in} kind {p['kind']} {name}")

(out_dir / "places.txt").write_text("\n".join(lines) + "\n")
(root / "places27r.txt").write_text("\n".join(lines) + "\n")
print(f"sheets {len(lines)} in {out_dir}")
for l in lines[:10]:
    print(l)
