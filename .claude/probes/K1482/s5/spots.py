# K1482 s5: 4x crops of named world spots from two bar capture dirs: base fill | ref fill | base border | ref border.
#   python s5/spots.py <baseDir> <refDir> <out.png> scene:wx:wy[:label] ...   env CR=40 (device px half-size)
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
bd, rd, out = sys.argv[1:4]; spots = sys.argv[4:]; CR = int(os.environ.get("CR", "40")); Z = 4; T = 2 * CR * Z; G = 6
rows = []
for sp in spots:
    p = sp.split(":"); sc, wx, wy = p[0], float(p[1]), float(p[2]); lab = p[3] if len(p) > 3 else f"{sc} {wx}:{wy}"
    row = Image.new("RGB", (4 * (T + G) + G, T + 18), "white"); d = ImageDraw.Draw(row)
    for q, (dr, kind) in enumerate([(bd, "fill"), (rd, "fill"), (bd, "border"), (rd, "border")]):
        M = json.load(open(os.path.join(dr, "cap", sc, "meta.json"))); I = Image.open(os.path.join(dr, "cap", sc, f"{kind}.png")).convert("RGB")
        dpr = M["dpr"]; s = M["view"]["s"] * dpr; cx = round(wx * s + M["view"]["x"] * dpr); cy = round(wy * s + M["view"]["y"] * dpr)
        t = I.crop((cx - CR, cy - CR, cx + CR, cy + CR)).resize((T, T), Image.NEAREST); x = G + q * (T + G); row.paste(t, (x, 18))
        d.text((x + 2, 3), f"{lab} {'base' if q % 2 == 0 else 'ref'} {kind}", fill="red")
    rows.append(row)
sh = Image.new("RGB", (rows[0].width, sum(r.height + G for r in rows)), "white"); y = 0
for r in rows: sh.paste(r, (0, y)); y += r.height + G
sh.save(out); print("wrote", out)
