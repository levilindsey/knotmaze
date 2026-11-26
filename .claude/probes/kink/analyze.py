"""kink-diag analysis of one cap.mjs capture (today_load1 + gf_load1).

  python .claude/probes/kink/analyze.py <outDir> [--levi x0,x1,ymin]

Prints, then writes <outDir>/report.json and the sheets:
  1. physics: today's and gf's dump hashes and positions (same state?);
  2. centre lines: today's chainSamples vs gf's chainSamples vs gf's own
     vertex table (vx/vy, the polyline gf's SDF is evaluated against);
  3. turning of the drawn centre line: per sample the turn angle and the
     local radius R (ribbon_mesh's formula), turn summed over a 0.3-world
     arc window, counts above thresholds, R vs the half width h;
  4. the control polygon (the particles): turn angle per control and its
     excess over the two neighbours' mean (a lone sharp particle = a
     physics kink), and which control each worst place sits on;
  5. the worst 8 places (window turn, 1.2 world apart) plus Levi's spot
     (bottom edge, about a third in from the right corner) as 8x crops,
     columns today | gf | today + controls (red) and centre line (cyan),
     and per crop the today-vs-gf pixel difference (a control row of
     smooth places gives the floor).
"""
import json, math, sys, os
import numpy as np
from PIL import Image, ImageDraw

out = sys.argv[1]
A = json.load(open(os.path.join(out, "today_load1.json")))
B = json.load(open(os.path.join(out, "gf_load1.json")))
rep = {}

# 1. physics
pa, pb = np.array(A["positions"]), np.array(B["positions"])
rep["physics"] = {"hashToday": A["hash"], "hashGf": B["hash"], "simToday": A["simTime"], "simGf": B["simTime"],
                  "posMaxDiff": float(np.abs(pa - pb).max()) if pa.shape == pb.shape else None,
                  "freezeHashToday": A["frozen"]["hash"], "freezeHashGf": B["frozen"]["hash"]}
print("physics", rep["physics"])

# 2. centre lines
def pts(s):
    p = np.array(s["pos"], dtype=np.float64).reshape(-1, 2)
    return p[: s["count"]]
nch = len(A["samples"])
dmax = 0.0
for c in range(nch):
    sa, sb = A["samples"][c], B["samples"][c]
    if sa is None or sb is None:
        continue
    if sa["count"] != sb["count"]:
        dmax = float("inf"); break
    dmax = max(dmax, float(np.abs(pts(sa) - pts(sb)).max()))
rep["samplesTodayVsGf"] = dmax
print("chainSamples today vs gf: max |d| =", dmax)

T = B["gfT"]
gfv = None
if T:
    vx, vy = np.array(T["vx"]), np.array(T["vy"])
    gfv = np.stack([vx, vy], 1)
    # nearest gf vertex for every renderer sample (grid hash), and the reverse
    allS = np.concatenate([pts(s) for s in B["samples"] if s is not None])
    def nearest(src, dst, cell=0.25):
        key = lambda p: (int(math.floor(p[0] / cell)), int(math.floor(p[1] / cell)))
        grid = {}
        for i, p in enumerate(dst):
            grid.setdefault(key(p), []).append(i)
        res = np.empty(len(src))
        for i, p in enumerate(src):
            kx, ky = key(p); best = 1e9
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for j in grid.get((kx + dx, ky + dy), ()):
                        d = (dst[j][0] - p[0]) ** 2 + (dst[j][1] - p[1]) ** 2
                        if d < best: best = d
            res[i] = math.sqrt(best) if best < 1e9 else 9.9
        return res
    d1 = nearest(gfv, allS)
    d2 = nearest(allS, gfv)
    rep["gfVtxVsSamples"] = {"nGfVerts": int(len(gfv)), "nSamples": int(len(allS)), "gfToSamplesMax": float(d1.max()),
                             "gfToSamplesP99": float(np.percentile(d1, 99)), "samplesToGfMax": float(d2.max()),
                             "samplesToGfP99": float(np.percentile(d2, 99)), "h": T["h"], "nC": T["nC"]}
    print("gf vtx vs samples", rep["gfVtxVsSamples"])

# 3. turning of the drawn centre line
h = A["threadWidth"] / 2
WIN = 0.15  # half window, world
places = []  # (windowTurnDeg, chain, i, x, y, turnDeg, R)
stats = {"samples": 0, "turnGt10": 0, "turnGt20": 0, "turnGt30": 0, "RltH": 0, "Rlt1_5H": 0, "Rlt2H": 0,
         "win30": 0, "win45": 0, "win60": 0}
chainTurn = {}
for c in range(nch):
    s = B["samples"][c]
    if s is None:
        continue
    P = pts(s); n = len(P); closed = s["closed"]
    idx = range(n) if closed else range(1, n - 1)
    th = np.zeros(n); R = np.full(n, np.inf); arc = np.zeros(n)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    arc[1:] = np.cumsum(seg)
    for i in idx:
        a = P[i] - P[(i - 1) % n]; b = P[(i + 1) % n] - P[i]
        la, lb = np.linalg.norm(a), np.linalg.norm(b)
        if la < 1e-6 or lb < 1e-6:
            continue
        dot = float(np.clip(a @ b / (la * lb), -1, 1))
        cr = a[0] * b[1] - a[1] * b[0]
        t = math.degrees(math.acos(dot)) * (1 if cr >= 0 else -1)
        th[i] = t
        sh = math.sqrt(max((1 - dot) / 2, 0)); ch = math.sqrt(max((1 + dot) / 2, 0))
        if sh > 1e-6:
            R[i] = ((la + lb) / 4) * (ch / sh)
    total = arc[-1] + (np.linalg.norm(P[0] - P[-1]) if closed else 0)
    # window turn: signed sum within +-WIN arc (cyclic when closed)
    wt = np.zeros(n)
    for i in idx:
        acc = 0.0
        for j in range(n):
            d = abs(arc[j] - arc[i])
            if closed: d = min(d, total - d)
            if d <= WIN: acc += th[j]
        wt[i] = acc
    chainTurn[c] = (P, th, R, wt, arc, closed)
    for i in idx:
        stats["samples"] += 1
        at = abs(th[i])
        stats["turnGt10"] += at > 10; stats["turnGt20"] += at > 20; stats["turnGt30"] += at > 30
        stats["RltH"] += R[i] < h; stats["Rlt1_5H"] += R[i] < 1.5 * h; stats["Rlt2H"] += R[i] < 2 * h
        aw = abs(wt[i]); stats["win30"] += aw > 30; stats["win45"] += aw > 45; stats["win60"] += aw > 60
        places.append((aw, c, i, float(P[i][0]), float(P[i][1]), float(th[i]), float(R[i])))
stats = {k: int(v) for k, v in stats.items()}
stats["h"] = h
rep["turning"] = stats
print("turning", stats)

# 4. control polygon (particles)
pos = pa.reshape(-1, 2)
chains = A["chains"]; brk = A["breakAfter"]
ctrlInfo = {}
cstats = {"ctrls": 0, "turnGt30": 0, "turnGt45": 0, "turnGt60": 0, "excessGt15": 0, "excessGt25": 0}
spacing = []
for c, ch in enumerate(chains):
    Q = pos[np.array(ch)]; m = len(Q); closed = brk[c] < 0
    phi = np.zeros(m); exc = np.zeros(m)
    for k in (range(m) if closed else range(1, m - 1)):
        a = Q[k] - Q[(k - 1) % m]; b = Q[(k + 1) % m] - Q[k]
        la, lb = np.linalg.norm(a), np.linalg.norm(b)
        if la < 1e-9 or lb < 1e-9: continue
        dot = float(np.clip(a @ b / (la * lb), -1, 1)); cr = a[0] * b[1] - a[1] * b[0]
        phi[k] = math.degrees(math.acos(dot)) * (1 if cr >= 0 else -1)
    for k in (range(m) if closed else range(2, m - 2)):
        nb = (phi[(k - 1) % m] + phi[(k + 1) % m]) / 2
        exc[k] = abs(phi[k]) - abs(nb) if np.sign(phi[k]) == np.sign(nb) or nb == 0 else abs(phi[k]) + abs(nb)
        cstats["ctrls"] += 1
        cstats["turnGt30"] += abs(phi[k]) > 30; cstats["turnGt45"] += abs(phi[k]) > 45; cstats["turnGt60"] += abs(phi[k]) > 60
        cstats["excessGt15"] += exc[k] > 15; cstats["excessGt25"] += exc[k] > 25
    spacing.extend(np.linalg.norm(np.diff(Q, axis=0), axis=1).tolist())
    ctrlInfo[c] = (Q, phi, exc, closed)
cstats = {k: int(v) for k, v in cstats.items()}
cstats["spacingMedian"] = float(np.median(spacing)); cstats["spacingP5"] = float(np.percentile(spacing, 5))
cstats["spacingP95"] = float(np.percentile(spacing, 95))
rep["controls"] = cstats
print("controls", cstats)

def ctrl_at(c, i):
    s = B["samples"][c]; cal = np.array(s["cal"])
    P, th, R, wt, arc, closed = chainTurn[c]
    a = arc[i]
    k = int(np.argmin(np.abs(cal - a)))
    Q, phi, exc, _ = ctrlInfo[c]
    k = min(k, len(Q) - 1)
    return k, float(phi[k]), float(exc[k]), float(a - cal[k]), float(np.linalg.norm(Q[k] - chainTurn[c][0][i]))

# 5. worst places + Levi's spot
places.sort(key=lambda p: -p[0])
allP = np.concatenate([chainTurn[c][0] for c in chainTurn])
xmin, ymin = allP.min(0); xmax, ymax = allP.max(0)
rep["bbox"] = [float(xmin), float(ymin), float(xmax), float(ymax)]
picked = []
for p in places:
    if all((p[3] - q[3]) ** 2 + (p[4] - q[4]) ** 2 > 1.2 ** 2 for q in picked):
        picked.append(p)
    if len(picked) == 8: break
# Levi: bottom of the maze, about a third from the right corner
lx0, lx1 = xmax - 0.5 * (xmax - xmin), xmax - 0.15 * (xmax - xmin)
bottom = [p for p in places if lx0 <= p[3] <= lx1 and p[4] >= ymax - 1.6]
levi = bottom[0] if bottom else None
smooth = [p for p in places if p[0] < 5][:: max(1, len(places) // 200)]
rng = np.random.default_rng(3)
ctrlRows = [smooth[i] for i in rng.choice(len(smooth), size=min(3, len(smooth)), replace=False)] if smooth else []

dpr = A["dpr"]; wtA = A["wt"]
def to_px(x, y, w):
    return ((w["a"] * x + w["c"] * y + w["tx"]) * dpr, (w["b"] * x + w["d"] * y + w["ty"]) * dpr)
imA = Image.open(os.path.join(out, "today_load1.png")).convert("RGB")
imB = Image.open(os.path.join(out, "gf_load1.png")).convert("RGB")
scale = math.hypot(wtA["a"], wtA["b"]) * dpr  # device px per world unit
HALF = int(round(max(28, 1.3 * scale)))  # crop half size, device px (~1.3 world)
Z = 8
rep["view"] = {"pxPerWorld": scale, "cropHalfPx": HALF, "zoom": Z, "wtToday": A["wt"], "wtGf": B["wt"]}

def crop(im, cx, cy):
    box = (int(cx) - HALF, int(cy) - HALF, int(cx) + HALF, int(cy) + HALF)
    return im.crop(box).resize((2 * HALF * Z, 2 * HALF * Z), Image.NEAREST), box

def overlay(base, box, c):
    d = ImageDraw.Draw(base)
    P = chainTurn[c][0]
    for cc in chainTurn:
        P = chainTurn[cc][0]
        q = [((to_px(x, y, wtA)[0] - box[0]) * Z, (to_px(x, y, wtA)[1] - box[1]) * Z) for x, y in P]
        if chainTurn[cc][5]: q.append(q[0])
        d.line(q, fill=(0, 200, 220), width=2)
    for cc in ctrlInfo:
        for x, y in ctrlInfo[cc][0]:
            u, v = to_px(x, y, wtA); u = (u - box[0]) * Z; v = (v - box[1]) * Z
            if -10 <= u <= 2 * HALF * Z + 10 and -10 <= v <= 2 * HALF * Z + 10:
                d.ellipse([u - 6, v - 6, u + 6, v + 6], outline=(230, 20, 20), width=3)
    return base

rows = []
named = [("levi", levi)] if levi else []
named += [(f"worst{j + 1}", p) for j, p in enumerate(picked)]
named += [(f"smooth{j + 1}", p) for j, p in enumerate(ctrlRows)]
for name, p in named:
    aw, c, i, x, y, t, R = p
    k, phi, exc, dArc, dCtrl = ctrl_at(c, i)
    cx, cy = to_px(x, y, wtA)
    cxB, cyB = to_px(x, y, B["wt"])
    ca, box = crop(imA, cx, cy); cb, _ = crop(imB, cxB, cyB)
    arrA = np.asarray(imA.crop(box), dtype=np.int16); arrB = np.asarray(imB.crop((int(cxB) - HALF, int(cyB) - HALF, int(cxB) + HALF, int(cyB) + HALF)), dtype=np.int16)
    diff = np.abs(arrA - arrB).max(2)
    co = overlay(ca.copy(), box, c)
    row = {"name": name, "chain": c, "sample": i, "x": x, "y": y, "px": [cx / dpr, cy / dpr], "winTurnDeg": aw,
           "turnDeg": t, "R": R, "R_over_h": R / h, "ctrl": k, "ctrlTurnDeg": phi, "ctrlExcessDeg": exc,
           "sampleToCtrlArc": dArc, "diffPx>24": int((diff > 24).sum()), "diffMean": float(diff.mean())}
    rows.append(row)
    W2 = 2 * HALF * Z
    sheet = Image.new("RGB", (3 * W2 + 40, W2 + 44), (255, 255, 255))
    sheet.paste(ca, (0, 44)); sheet.paste(cb, (W2 + 20, 44)); sheet.paste(co, (2 * W2 + 40, 44))
    dr = ImageDraw.Draw(sheet)
    dr.text((8, 4), f"{name}: chain {c} sample {i}  window turn {aw:.0f} deg / 0.3 world  sample turn {t:.1f} deg  R/h {R / h:.2f}  "
                    f"ctrl {k}: turn {phi:.0f} deg, excess over neighbours {exc:.0f} deg   today | gf | today + ctrls (red) + centre line (cyan)   {Z}x",
            fill=(0, 0, 0))
    dr.text((8, 22), f"today-vs-gf px >24 levels: {row['diffPx>24']} of {(2 * HALF) ** 2}   mean {row['diffMean']:.1f}", fill=(0, 0, 0))
    sheet.save(os.path.join(out, f"sheet_{name}.png"))
    print(name, {k2: (round(v, 3) if isinstance(v, float) else v) for k2, v in row.items() if k2 != "name"})
rep["places"] = rows

# top control excesses (lone sharp particles) anywhere
lone = []
for c, (Q, phi, exc, closed) in ctrlInfo.items():
    for k in range(len(Q)):
        lone.append((float(exc[k]), c, k, float(Q[k][0]), float(Q[k][1]), float(phi[k])))
lone.sort(key=lambda r: -r[0])
rep["loneSharpCtrls"] = lone[:15]
print("lone sharp ctrls (excess, chain, ctrl, x, y, turn):", [tuple(round(v, 2) if isinstance(v, float) else v for v in r) for r in lone[:10]])
json.dump(rep, open(os.path.join(out, "report.json"), "w"), indent=1)
