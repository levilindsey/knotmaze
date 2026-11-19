# K1482 s17: the sort of a site's light pixels by the term that makes them, from a debug run (terms16.py's decode).
# Per site, in the 48x48 device box: the frame (levels stretched) | the same with each pixel the frame shows light
# (RGB sum > 73) but that the debug run attributes, coloured:
#   red     a cut removed field ink (thr(ink) >= .5, a < .5) and the slot carries no flag (jb 0): cause 1's kind
#   magenta a cut removed field ink and the slot is flagged (jb != 0) on this pixel's side (J)
#   orange  a cut removed field ink, the slot flagged (jb != 0) but not on this pixel's side
#   yellow  no cut, the field's own ink is partial (.05 < ink < .5) next to full ink: cause 2's kind (a seam)
# and prints the counts.
#   python sort17.py <out.png> <dbg dir> <frame.png> <sites_gf.json> <name,name,...> [Z=6] [half-box=24]
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, d, frame, sjp, names = sys.argv[1:6]
Z = int(sys.argv[6]) if len(sys.argv) > 6 else 6
HR = int(sys.argv[7]) if len(sys.argv) > 7 else 24
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
B, F, FR = L(d + "/gf.png"), L(d + "/gf_fill.png"), L(frame)
S = {s["site"]: s for s in json.load(open(sjp))["sites"]}
thr = lambda i: min(max((i - 0.36) * 3.5, 0.0), 1.0)
H = HR; W = (2 * H) * Z
rows = names.split(",")
sheet = Image.new("RGB", (2 * (W + 6), len(rows) * (W + 18)), "white")
for r, nm in enumerate(rows):
    cx, cy = int(round(S[nm]["x"])), int(round(S[nm]["y"]))
    crop = FR[cy - H:cy + H, cx - H:cx + H]
    img = np.clip((crop - 14) * 6, 0, 255).astype(np.uint8)
    mark = img.copy(); cnt = {"red": 0, "mag": 0, "org": 0, "yel": 0}
    for yy in range(2 * H):
        for xx in range(2 * H):
            y, x = cy - H + yy, cx - H + xx
            if FR[y, x].sum() <= 73: continue
            b, f = B[y, x], F[y, x]
            if (b == f).all() or (b.sum() == 0 and f.sum() == 0): continue
            fl = int(b[2]); gl, gn = (f[0] // 16) / 15, (f[1] // 16) / 15
            ink = (int(f[2]) // 4) / 63; jb = int(f[2]) % 4
            cut = max(gl, gn)
            if thr(ink) >= 0.5 and thr(ink) * (1 - cut) < 0.5:
                k = "red" if jb == 0 else ("mag" if fl & 4 else "org")
            elif 0.05 < ink < 0.5 and cut < 0.1:
                nb = FR[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).sum(1)
                if (nb <= 73).sum() < 3: continue
                k = "yel"
            else: continue
            cnt[k] += 1
            mark[yy, xx] = {"red": (255, 0, 0), "mag": (255, 0, 255), "org": (255, 150, 0), "yel": (255, 255, 0)}[k]
    for c, im in enumerate((img, mark)):
        t = Image.fromarray(im).resize((W, W), Image.NEAREST); dr = ImageDraw.Draw(t)
        dr.text((3, 3), f"{nm} ({cx},{cy})" if c == 0 else " ".join(f"{k} {v}" for k, v in cnt.items()), fill=(255, 255, 0) if c == 0 else (0, 255, 0))
        sheet.paste(t, (c * (W + 6), r * (W + 18)))
    print(nm, cx, cy, cnt)
sheet.save(out); print(out, sheet.size)
