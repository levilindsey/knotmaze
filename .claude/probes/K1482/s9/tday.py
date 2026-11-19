# K1482 s9: does TODAY draw the under's outline where gf's gap removes it? Per crossing with removed pixels (rmall.py),
# the share of them that today's frame inks (within 1 px), today's frame shot with bg=none&cs=mono so its outlines can
# be told from the background (the s8 today.png has the textured backdrop: its outlines are 15-25 levels off it).
#   python tday.py <xpos9.json> <rmall.json> <today.png> <master gf.png> [TH=60]
# GAP crossings (the 12 cause-B sites) are starred; the rest are every other crossing with removed pixels.
import json, os, sys
import numpy as np
from PIL import Image
xp, rp, tp, gp = sys.argv[1:5]
TH = int(os.environ.get("TH", 60))
GAP = {235: "j87", 325: "j49", 252: "j55", 77: "j36", 331: "t79s", 57: "j22", 291: "j29", 43: "t65s", 339: "t80s", 73: "t81s", 40: "t70s", 119: "j88"}
T = np.asarray(Image.open(tp).convert("RGB")).astype(int)
vals, cnt = np.unique(T.reshape(-1, 3)[::97], axis=0, return_counts=True); bg = vals[cnt.argmax()]
S = np.abs(T - bg).sum(-1) > TH
G = np.asarray(Image.open(gp).convert("RGB")).astype(int).sum(-1) <= 73
print(f"bg {bg.tolist()} today ink {S.sum()} on gf ink {(S & G).sum() / max(S.sum(), 1):.3f} gf ink covered {(S & G).sum() / G.sum():.3f}")
b = S.copy(); b[1:] |= S[:-1]; b[:-1] |= S[1:]; SD = b.copy(); SD[:, 1:] |= b[:, :-1]; SD[:, :-1] |= b[:, 1:]
X = {c["i"]: c for c in json.load(open(xp))}; RM = json.load(open(rp))
rows = []
for k, px in RM.items():
    if not px: continue
    i = int(k); a = np.array(px); f = SD[a[:, 1], a[:, 0]].mean(); c = X[i]
    rows.append((f, i, len(px), min(abs(c["jo"]), abs(c["ju"])), c["site"]))
for f, i, n, j, s in sorted(rows, reverse=True):
    print(f"{'*' if i in GAP else ' '} x{i} {GAP.get(i, s):5s} rm {n:3d} today-inked {f:.2f} nearest joint arc {j:.2f}")
g = [r[0] for r in rows if r[1] in GAP]; o = [r[0] for r in rows if r[1] not in GAP and r[3] < 1.4]
print(f"GAP mean {np.mean(g):.2f} (n {len(g)}); near-joint others (arc < 1.4) mean {np.mean(o):.2f} (n {len(o)})")
