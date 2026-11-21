# K1548 (27U): offline dot-rule exploration on diagA captures. Ink-coverage read: per side, the
# reference U is the thread's outline ink in each renderer's own fl=0 frame (the lateral sample
# of largest |P-BG| at the walk's far end), because on link A the thread body IS the backdrop in
# both renderers and only the outlines carry ink. A footprint pixel's coverage is its projection
# on its own renderer's U. Faded zone = profile points past the over body whose da is within
# fl world of the gap's outer end (iu).
#   python .claude/probes/K1548/dotsA.py <diagDir> [fl ...]
import json, sys
import numpy as np
from PIL import Image

d = sys.argv[1]
fls = [float(x) for x in sys.argv[2:]] or [1.2, 0.5, 0.14, 0.0]
geo = json.load(open(f"{d}/geo.json"))
DSF = 2
scale = geo["view"]["s"] * DSF

def load(n):
    return np.asarray(Image.open(f"{d}/{n}").convert("RGB")).astype(np.float64)

refT = load("shot_today_0.png"); refG = load("shot_gf_0.png")
flat = refT[::7, ::7].reshape(-1, 3).astype(int)
hist = {}
for k in map(tuple, flat): hist[k] = hist.get(k, 0) + 1
BG = np.array(max(hist.items(), key=lambda kv: kv[1])[0], dtype=np.float64)

def px(D, x, y):
    return D[min(D.shape[0] - 1, max(0, round(y))), min(D.shape[1] - 1, max(0, round(x)))]

def sideU(D, g):
    # lateral scan at the far end point: outline ink peak
    p = g["prof"][-1]
    if len(g["prof"]) > 1:
        q = g["prof"][-2]; tx, ty = p["x"] - q["x"], p["y"] - q["y"]; tl = np.hypot(tx, ty) or 1; nx, ny = -ty / tl, tx / tl
    else: nx, ny = 1.0, 0.0
    hd = g["hOver"] * scale * 1.3
    best, bu = None, None
    o = -hd
    while o <= hd:
        v = px(D, p["x"] + nx * o, p["y"] + ny * o) - BG
        n = float(v @ v)
        if best is None or n > best: best, bu = n, v
        o += 1.0
    return bu, best

sides = []
for g in geo["sides"]:
    reach = g["hOver"] + (g["slot"]["margin"] if g["slot"] else 0.1) + 0.08
    iu = next((i for i, p in enumerate(g["prof"]) if p["dO"] > reach), -1)
    if iu < 0 or iu > len(g["prof"]) - 5: continue
    first = next((i for i, p in enumerate(g["prof"]) if p["dO"] > g["hOver"] + 0.5 / scale), -1)
    if first < 0: continue
    UT, uuT = sideU(refT, g); UG, uuG = sideU(refG, g)
    sides.append((g, iu, first, UT, uuT, UG, uuG))
print(f"{d}: kept candidates {len(sides)} of {len(geo['sides'])}  (uuT med {np.median([s[4] for s in sides]):.0f}, uuG med {np.median([s[6] for s in sides]):.0f})")

for fl in fls:
    shots = {"today": load(f"shot_today_{fl}.png"), "gf": load(f"shot_gf_{fl}.png"), "gfh": load(f"shot_gfh_{fl}.png")}
    for var in ["gf", "gfh"]:
        D = shots[var]
        def cov(DD, x, y, U):
            uu = float(U @ U)
            if uu < 40: return float("nan")
            return float((px(DD, x, y) - BG) @ U / uu)
        nOldSides = nNewSides = totOld = totNew = 0
        top = []
        for (g, iu, first, UT, uuT, UG, uuG) in sides:
            if uuG < 100 or uuT < 40: continue
            daIu = g["prof"][iu]["da"]
            pix = []; seen = set()
            for i in range(first, len(g["prof"]) - 1):
                if g["prof"][i]["da"] > daIu + fl + 0.05: continue
                if not (g["prof"][i]["dO"] > g["hOver"] + 1.5 / scale): continue
                tx = g["prof"][i + 1]["x"] - g["prof"][i]["x"]; ty = g["prof"][i + 1]["y"] - g["prof"][i]["y"]; tl = np.hypot(tx, ty) or 1
                nx, ny = -ty / tl, tx / tl
                hd = g["hOver"] * scale * 0.85
                o = -hd
                while o <= hd:
                    x = round(g["prof"][i]["x"] + nx * o); y = round(g["prof"][i]["y"] + ny * o); k = (x, y)
                    if k not in seen: seen.add(k); pix.append((x, y))
                    o += 0.5
            nO = nN = 0
            for (x, y) in pix:
                cv = cov(D, x, y, UG); ct = cov(shots["today"], x, y, UT)
                if not (cv - ct > 0.2): continue
                gNb = [cov(D, x + 1, y, UG), cov(D, x - 1, y, UG), cov(D, x, y + 1, UG), cov(D, x, y - 1, UG)]
                nb = sum(gNb) / 4
                if cv - nb > 0.12:
                    nO += 1
                    if cv - max(gNb) > 0.08: nN += 1
            totOld += nO; totNew += nN
            if nO > 2: nOldSides += 1
            if nN > 2: nNewSides += 1
            if nN > 0: top.append((nN, nO, g["ci"], g["side"], g["at"]))
        top.sort(reverse=True)
        print(f" fl={fl} {var}: OLD dots {totOld} sides>2 {nOldSides} | NEW dots {totNew} sides>2 {nNewSides} | topNew {top[:5]}")
