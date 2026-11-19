# K1482 s17: per-site 4x tiles of two frames of one physics state: A | B | B with its ink gains (green) and losses
# (red) against A marked (ink = RGB sum <= 73; a gain needs A >= 80 there, a loss B >= 80: the hysteresis).
# Levels stretched. Rows of sites, one sheet per call.
#   python tiles17.py <out.png> <A.png> <B.png> <sites_gf.json> <name,name@x:y,...> [Z=4] [half-box=24]
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, fa, fb, sjp, names = sys.argv[1:6]
Z = int(sys.argv[6]) if len(sys.argv) > 6 else 4
H = int(sys.argv[7]) if len(sys.argv) > 7 else 24
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
A, B = L(fa), L(fb)
S = {s["site"]: s for s in json.load(open(sjp))["sites"]}
W = 2 * H * Z; rows = names.split(",")
sheet = Image.new("RGB", (3 * (W + 6), len(rows) * (W + 6)), "white")
for r, nm in enumerate(rows):
    if "@" in nm: nm, p = nm.split("@"); cx, cy = map(int, p.split(":"))  # name@x:y centres the tile on a pixel
    else: cx, cy = int(round(S[nm]["x"])), int(round(S[nm]["y"]))
    ca, cb = A[cy - H:cy + H, cx - H:cx + H], B[cy - H:cy + H, cx - H:cx + H]
    sa, sb = ca.sum(2), cb.sum(2)
    gain = (sb <= 73) & (sa >= 80); loss = (sa <= 73) & (sb >= 80)
    st = lambda c: np.clip((c - 14) * 6, 0, 255).astype(np.uint8)
    m = st(cb).copy(); m[gain] = (0, 220, 0); m[loss] = (255, 0, 0)
    for c, im in enumerate((st(ca), st(cb), m)):
        t = Image.fromarray(im).resize((W, W), Image.NEAREST); dr = ImageDraw.Draw(t)
        lab = (f"{nm} ({cx},{cy}) start", "tip", f"+{int(gain.sum())} -{int(loss.sum())}")[c]
        dr.rectangle((0, 0, 7 * len(lab) + 4, 13), fill=(0, 0, 0)); dr.text((3, 1), lab, fill=(255, 255, 0))
        sheet.paste(t, (c * (W + 6), r * (W + 6)))
sheet.save(out); print(out, sheet.size)
