# K1482 s5: the Crossing fade check. Per site, 4x tiles: master fl a|b|c, then tip fl a|b|c (frames <dir>/gf_fls<v>.png).
#   python s5/fade_sheet.py <mdir> <tdir> <sites.json> <out.png> <fl,fl,fl> [sites|auto:N] ; env R=20, TH=73
# auto:N picks the N sites where the TIP's frames differ most between the first and last fl (ink XOR within R), and
# prints, per site, the ink XOR between the first and last fl on master and on the tip.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
md, td, sj, out, fls = sys.argv[1:6]; fls = fls.split(","); pick = sys.argv[6] if len(sys.argv) > 6 else "auto:4"
R = int(os.environ.get("R", "20")); TH = int(os.environ.get("TH", "73")); Z = 4
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
def ld(d, v): return np.asarray(Image.open(os.path.join(d, f"gf_fls{v}.png")).convert("RGB")).astype(int)
M = {v: ld(md, v) for v in fls}; T = {v: ld(td, v) for v in fls}
def ink(a): return a.sum(2) <= TH
def win(a, s): cx, cy = round(s["x"]), round(s["y"]); return a[max(0, cy - R):cy + R, max(0, cx - R):cx + R]
def xor(F, s): return int((ink(win(F[fls[0]], s)) ^ ink(win(F[fls[-1]], s))).sum())
print("frame-wide ink XOR fl", fls[0], "vs", fls[-1], ": master", int((ink(M[fls[0]]) ^ ink(M[fls[-1]])).sum()), "tip", int((ink(T[fls[0]]) ^ ink(T[fls[-1]])).sum()))
if pick.startswith("auto:"):
    n = int(pick[5:]); sc = sorted(S, key=lambda k: -xor(T, S[k])); names = sc[:n]
elif pick.startswith("home:"):
    n = int(pick[5:]); sc = sorted(S, key=lambda k: -(xor(T, S[k]) - xor(M, S[k]))); names = sc[:n]
else: names = pick.split(",")
for k in names: print(k, "xor fl", fls[0], "vs", fls[-1], ": master", xor(M, S[k]), "tip", xor(T, S[k]))
n = 2 * R * Z; G = 4; rows = []
for k in names:
    s = S[k]; tiles = []
    for F in (M, T):
        for v in fls: w = win(F[v], s).astype(float); w = np.clip((w - 10) * 255.0 / 90.0, 0, 255); tiles.append(Image.fromarray(w.astype(np.uint8)).resize((n, n), Image.NEAREST))
    W = 6 * n + 7 * G + G; row = Image.new("RGB", (W, n + 16), "white"); d = ImageDraw.Draw(row)
    for i, t in enumerate(tiles): x = G + i * (n + G) + (G if i >= 3 else 0); row.paste(t, (x, 16)); d.text((x + 2, 2), f"{k} {'master' if i < 3 else 'tip'} fl {fls[i % 3]}", fill="red")
    rows.append(row)
sheet = Image.new("RGB", (rows[0].width, sum(r.height + G for r in rows)), "white"); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + G
sheet.save(out); print("wrote", out, names)
