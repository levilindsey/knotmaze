"""Where do the drawn centre line's sharp places sit? For one capture
(cap.mjs output), per sample: window turn over +-0.15 world of arc
(as analyze.py), distance to the maze's bounding-box edge, distance to
the nearest OTHER chain's sample (a crossing or junction neighbour),
arc distance to an open chain's end. Prints rates of win>45 deg per
bucket, so a place type is judged against how much line it has.
  python .claude/probes/kink/attrib.py <outDir> [today|gf]
"""
import json, sys, os
import numpy as np
out = sys.argv[1]; mode = sys.argv[2] if len(sys.argv) > 2 else "today"
D = json.load(open(os.path.join(out, f"{mode}_load1.json")))
rows = []  # x, y, win, chain, arcFromEnd(open) or inf
allP = []; allC = []
for ci, s in enumerate(D["samples"]):
    if not s: continue
    P = np.array(s["pos"]).reshape(-1, 2)[: s["count"]]
    allP.append(P); allC.append(np.full(len(P), ci))
allP = np.concatenate(allP); allC = np.concatenate(allC)
for ci, s in enumerate(D["samples"]):
    if not s: continue
    P = np.array(s["pos"]).reshape(-1, 2)[: s["count"]]
    # drop repeated points (chain-end duplicates: their segment angle is noise;
    # gf drops them too)
    keep = np.concatenate([[True], np.hypot(*np.diff(P, axis=0).T) > 1e-6])
    P = P[keep]
    n = len(P); closed = s["closed"]
    seg = np.diff(P, axis=0); L = np.hypot(seg[:, 0], seg[:, 1])
    ang = np.arctan2(seg[:, 1], seg[:, 0])
    arc = np.concatenate([[0], np.cumsum(L)])
    tot = arc[-1]
    for i in range(1, n - 1):
        lo = np.searchsorted(arc, arc[i] - 0.15); hi = np.searchsorted(arc, arc[i] + 0.15)
        lo = max(lo, 0); hi = min(hi, n - 1)
        if hi - lo < 2: continue
        d = np.diff(ang[lo:hi]); d = (d + np.pi) % (2 * np.pi) - np.pi
        win = abs(np.degrees(d.sum()))
        endd = np.inf if closed else min(arc[i], tot - arc[i])
        rows.append((P[i, 0], P[i, 1], win, ci, endd))
R = np.array(rows)
x, y, win, ch, endd = R.T
x0, y0 = allP.min(0); x1, y1 = allP.max(0)
edge = np.minimum.reduce([x - x0, x1 - x, y - y0, y1 - y])
# nearest other-chain sample: grid hash
cell = 0.5
from collections import defaultdict
g = defaultdict(list)
for k, (px, py) in enumerate(allP): g[(int(px // cell), int(py // cell))].append(k)
other = np.full(len(R), np.inf)
for k in range(len(R)):
    cx, cy = int(x[k] // cell), int(y[k] // cell)
    best = np.inf
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for j in g.get((cx + dx, cy + dy), ()):
                if allC[j] == ch[k]: continue
                dd = (allP[j, 0] - x[k]) ** 2 + (allP[j, 1] - y[k]) ** 2
                if dd < best: best = dd
    other[k] = np.sqrt(best)
sharp = win > 45
def table(name, v, edges):
    print(name)
    for a, b in zip(edges[:-1], edges[1:]):
        m = (v >= a) & (v < b)
        if m.sum() == 0: continue
        print(f"  [{a:5.2f},{b:5.2f}) samples {m.sum():6d}  win>45 {sharp[m].sum():4d}  rate {1000*sharp[m].mean():6.2f}/1000  win>30 rate {1000*(win[m]>30).mean():6.1f}/1000")
print(mode, "samples", len(R), "win>45", sharp.sum(), "bbox", (x0, y0, x1, y1))
table("distance to bbox edge (world)", edge, [0, 1, 2, 3, 5, 8, 100])
table("distance to nearest other-chain sample (world)", other, [0, 0.3, 0.5, 0.7, 1.0, 100])
table("arc to an open chain's end (world; inf = closed)", endd, [0, 0.5, 1, 2, 4, np.inf, np.inf + 1])
# the sharpest places (one per 1.2 world) with their location measures
order = np.argsort(-win); taken = []
print("top places: win deg, chain, x, y, arc-to-end, other-chain dist, edge dist")
for k in order:
    if win[k] <= 45: break
    if any((x[k] - x[t]) ** 2 + (y[k] - y[t]) ** 2 < 1.44 for t in taken): continue
    taken.append(k)
    print(f"  {win[k]:6.1f} c{int(ch[k]):3d} ({x[k]:6.2f},{y[k]:6.2f}) end {endd[k]:5.2f} other {other[k]:4.2f} edge {edge[k]:5.2f}")
    if len(taken) >= 20: break
lv = np.argmin((x - 24.674) ** 2 + (y - 35.097) ** 2)
print(f"levi spot: win {win[lv]:.1f} c{int(ch[lv])} end {endd[lv]:.2f} other {other[lv]:.2f} edge {edge[lv]:.2f}")
print("places with win>45:", len(taken) if len(taken) < 20 else ">=20", "; share of win>45 samples 1-2 world from an end:",
      round(float(((endd >= 1) & (endd < 2) & sharp).sum() / max(sharp.sum(), 1)), 2),
      "; share of line 1-2 world from an end:", round(float(((endd >= 1) & (endd < 2)).mean()), 3))
# places (clusters 1.2 world apart) where the centre line's radius drops
# under the half width h: there the border look's inner border (the offset
# at h, radius R - h) has no radius left and draws a corner (gf's exact SDF)
h = D["threadWidth"] / 2
def places_where(mask, key):
    idx = np.nonzero(mask)[0]; idx = idx[np.argsort(key[idx])]; got = []
    for k in idx:
        if all((x[k] - x[t]) ** 2 + (y[k] - y[t]) ** 2 >= 1.44 for t in got): got.append(k)
    return got
Rr = []
for ci, s in enumerate(D["samples"]):
    if not s: continue
    P = np.array(s["pos"]).reshape(-1, 2)[: s["count"]]
    keep = np.concatenate([[True], np.hypot(*np.diff(P, axis=0).T) > 1e-6]); P = P[keep]
    for i in range(1, len(P) - 1):
        a = P[i] - P[i - 1]; b = P[i + 1] - P[i]
        la, lb = np.hypot(*a), np.hypot(*b)
        dot = np.clip(a @ b / (la * lb), -1, 1)
        sh = np.sqrt(max((1 - dot) / 2, 0)); chh = np.sqrt(max((1 + dot) / 2, 0))
        Rr.append(((la + lb) / 4) * chh / sh if sh > 1e-9 else np.inf)
Rr = np.array(Rr)
if len(Rr) == len(R):
    for f in (1.0, 1.25, 1.5):
        g = places_where(Rr < f * h, Rr)
        print(f"R < {f}h: samples {(Rr < f * h).sum()}  places (1.2 world apart) {len(g)}")
    print("win>45 places", len(places_where(win > 45, -win)), " win>30 places", len(places_where(win > 30, -win)))
else:
    print("R length mismatch", len(Rr), len(R))
# control-polygon turn by control offset from an open chain's terminal
# (a junction joint or a dead end): is the sharp turn at a fixed offset?
pos2 = np.array(D["positions"]).reshape(D["n"], -1)[:, :2]
byOff = {}
for c, arr in enumerate(D["chains"]):
    brk = D["breakAfter"][c]; L = len(arr)
    if brk < 0 or L < 8: continue
    order = [arr[(brk + 1 + k) % L] for k in range(L)]
    Q = pos2[order]
    for k in range(1, L - 1):
        a = Q[k] - Q[k - 1]; b = Q[k + 1] - Q[k]
        la, lb = np.hypot(*a), np.hypot(*b)
        if la < 1e-6 or lb < 1e-6: continue
        t = abs(np.degrees(np.arctan2(a[0] * b[1] - a[1] * b[0], a @ b)))
        off = min(k, L - 1 - k)
        byOff.setdefault(min(off, 8), []).append(t)
print("ctrl offset from terminal: n, mean |turn|, share >30, share >45 (8 = 8 or more)")
for off in sorted(byOff):
    v = np.array(byOff[off])
    print(f"  {off}: n {len(v):5d}  mean {v.mean():5.1f}  >30 {(v > 30).mean():.3f}  >45 {(v > 45).mean():.3f}")
