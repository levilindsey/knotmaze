"""Wider side-by-side crops (a whole thread, both borders) of named world
points: today | gf | gf + centre line (cyan) + particle controls (red).
4x nearest, 5.2 world across.
  python .claude/probes/kink/sheets2.py <outDir> name:x:y [name:x:y ...]
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw
out = sys.argv[1]
A = json.load(open(os.path.join(out, "today_load1.json")))
imA = Image.open(os.path.join(out, "today_load1.png")).convert("RGB")
imB = Image.open(os.path.join(out, "gf_load1.png")).convert("RGB")
w = A["wt"]; dpr = A["dpr"]
to_px = lambda x, y: ((w["a"] * x + w["c"] * y + w["tx"]) * dpr, (w["b"] * x + w["d"] * y + w["ty"]) * dpr)
HALF, Z = 150, 4
pos = np.array(A["positions"]).reshape(-1, 2) if len(A["positions"]) == 2 * A["n"] else np.array(A["positions"]).reshape(A["n"], -1)[:, :2]
for arg in sys.argv[2:]:
    name, xs, ys = arg.split(":"); x, y = float(xs), float(ys)
    cx, cy = to_px(x, y)
    box = (int(cx - HALF), int(cy - HALF), int(cx + HALF), int(cy + HALF))
    S = 2 * HALF * Z
    sheet = Image.new("RGB", (3 * S + 20, S + 24), "white")
    pa = imA.crop(box).resize((S, S), Image.NEAREST); pb = imB.crop(box).resize((S, S), Image.NEAREST)
    pc = pb.copy(); d = ImageDraw.Draw(pc)
    loc = lambda px, py: ((px - box[0]) * Z, (py - box[1]) * Z)
    for s in A["samples"]:
        if not s: continue
        P = np.array(s["pos"]).reshape(-1, 2)[: s["count"]]
        q = [loc(*to_px(*p)) for p in P]
        d.line(q, fill=(0, 200, 255), width=3)
    for ch in A["chains"]:
        for k in ch:
            px, py = loc(*to_px(*pos[k]))
            if -10 < px < S + 10 and -10 < py < S + 10:
                d.ellipse((px - 6, py - 6, px + 6, py + 6), outline=(230, 0, 0), width=3)
    sheet.paste(pa, (0, 24)); sheet.paste(pb, (S + 10, 24)); sheet.paste(pc, (2 * S + 20, 24))
    ImageDraw.Draw(sheet).text((6, 6), f"{name}: world ({x:.2f},{y:.2f})  today | gf | gf + centre line (cyan) + particles (red)  {Z}x, {2 * HALF / (w['a'] * dpr):.1f} world across", fill="black")
    sheet.save(os.path.join(out, f"wide_{name}.png"))
    print("wrote", os.path.join(out, f"wide_{name}.png"))
