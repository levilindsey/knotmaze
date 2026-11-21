# K1548 (27U): mend candidates for the dot rule on diagA captures. Ink read as dotsA.py.
# Gates (all also need cv-ct>0.2): OLD = cv-meanNb>0.12; NEW = OLD + cv-maxNb>0.08;
# B = OLD + today's ink max over the 5x5 neighbourhood < 0.35 (today draws nothing near a
# dotted line, but has its own outline within a pixel or two of an edge step);
# C = B with the footprint's interior only (|lateral| <= 0.6 half-widths).
#   python .claude/probes/K1548/dotsB.py <diagDir> [fl ...]
import json, sys
import numpy as np
from PIL import Image

d = sys.argv[1]
fls = sys.argv[2:] or ["1.2", "0.5"]
geo = json.load(open(f"{d}/geo.json"))
scale = geo["view"]["s"] * 2

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
    p = g["prof"][-1]; q = g["prof"][-2]
    tx, ty = p["x"] - q["x"], p["y"] - q["y"]; tl = np.hypot(tx, ty) or 1; nx, ny = -ty / tl, tx / tl
    hd = g["hOver"] * scale * 1.3; best, bu = -1, None; o = -hd
    while o <= hd:
        v = px(D, p["x"] + nx * o, p["y"] + ny * o) - BG; n = float(v @ v)
        if n > best: best, bu = n, v
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
    if uuG < 100 or uuT < 40: continue
    sides.append((g, iu, first, UT, UG))
print(f"{d}: kept {len(sides)}")

for fls_ in fls:
    fl = float(fls_)
    T = load(f"shot_today_{fls_}.png"); G = load(f"shot_gf_{fls_}.png")
    def cov(D, x, y, U):
        return float((px(D, x, y) - BG) @ U / float(U @ U))
    res = {"OLD": [0, 0], "NEW": [0, 0], "B": [0, 0], "C": [0, 0]}
    tops = []
    for (g, iu, first, UT, UG) in sides:
        daIu = g["prof"][iu]["da"]
        pix = []; seen = set()
        for i in range(first, len(g["prof"]) - 1):
            if g["prof"][i]["da"] > daIu + fl + 0.05: continue
            if not (g["prof"][i]["dO"] > g["hOver"] + 1.5 / scale): continue
            tx = g["prof"][i + 1]["x"] - g["prof"][i]["x"]; ty = g["prof"][i + 1]["y"] - g["prof"][i]["y"]; tl = np.hypot(tx, ty) or 1
            nx, ny = -ty / tl, tx / tl
            hd = g["hOver"] * scale * 0.85; o = -hd
            while o <= hd:
                x = round(g["prof"][i]["x"] + nx * o); y = round(g["prof"][i]["y"] + ny * o)
                if (x, y) not in seen: seen.add((x, y)); pix.append((x, y, abs(o) / (g["hOver"] * scale)))
                o += 0.5
        cnt = {k: 0 for k in res}
        for (x, y, lat) in pix:
            cv = cov(G, x, y, UG); ct = cov(T, x, y, UT)
            if not (cv - ct > 0.2): continue
            gNb = [cov(G, x + 1, y, UG), cov(G, x - 1, y, UG), cov(G, x, y + 1, UG), cov(G, x, y - 1, UG)]
            if not (cv - sum(gNb) / 4 > 0.12): continue
            cnt["OLD"] += 1
            if cv - max(gNb) > 0.08: cnt["NEW"] += 1
            tmax = max(cov(T, x + dx, y + dy, UT) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
            if tmax < 0.35:
                cnt["B"] += 1
                if lat <= 0.6: cnt["C"] += 1
        for k in res:
            res[k][0] += cnt[k]
            if cnt[k] > 2: res[k][1] += 1
        if cnt["C"] > 2: tops.append((cnt["C"], cnt["B"], g["ci"], g["side"], g["at"]))
    print(f" fl={fls_} gf: " + " | ".join(f"{k} dots {v[0]} sides>2 {v[1]}" for k, v in res.items()) + f" | topC {sorted(tops, reverse=True)[:4]}")
