"""Is the drawn centre line the plain spline of the particles? Rebuild a
centripetal Catmull-Rom through each chain's controls (interior segments
only, 32 points each) and measure every drawn sample's distance to it,
binned by arc distance to the chain's end; and where the sharp samples
(window turn > 45 deg, as attrib.py) sit in that distance.
  python .claude/probes/kink/tuckdev.py <outDir>
"""
import json, sys, os
import numpy as np
D = json.load(open(os.path.join(sys.argv[1], "today_load1.json")))
pos = np.array(D["positions"]).reshape(D["n"], -1)[:, :2]
def cr(p0, p1, p2, p3, n=32):
    def tj(ti, a, b): return ti + max(np.hypot(*(b - a)), 1e-9) ** 0.5
    t0 = 0; t1 = tj(t0, p0, p1); t2 = tj(t1, p1, p2); t3 = tj(t2, p2, p3)
    out = []
    for t in np.linspace(t1, t2, n):
        A1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
        A2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
        A3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
        B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2
        B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3
        out.append((t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2)
    return np.array(out)
rows = []  # endDist, dev, win
for c, arr in enumerate(D["chains"]):
    s = D["samples"][c]
    if not s: continue
    brk = D["breakAfter"][c]; L = len(arr)
    order = [arr[(brk + 1 + k) % L] for k in range(L)] if brk >= 0 else list(arr)
    Q = pos[order]
    if brk < 0: Q = np.vstack([Q[-1:], Q, Q[:2]])
    if len(Q) < 4: continue
    curve = np.vstack([cr(Q[i - 1], Q[i], Q[i + 1], Q[i + 2]) for i in range(1, len(Q) - 2)])
    P = np.array(s["pos"]).reshape(-1, 2)[: s["count"]]
    keep = np.concatenate([[True], np.hypot(*np.diff(P, axis=0).T) > 1e-6]); P = P[keep]
    seg = np.diff(P, axis=0); Ls = np.hypot(*seg.T); ang = np.arctan2(seg[:, 1], seg[:, 0])
    arc = np.concatenate([[0], np.cumsum(Ls)]); tot = arc[-1]
    for i in range(1, len(P) - 1):
        lo = max(np.searchsorted(arc, arc[i] - 0.15), 0); hi = min(np.searchsorted(arc, arc[i] + 0.15), len(P) - 1)
        if hi - lo < 2: continue
        dd = np.diff(ang[lo:hi]); dd = (dd + np.pi) % (2 * np.pi) - np.pi
        win = abs(np.degrees(dd.sum()))
        dev = np.sqrt(((curve - P[i]) ** 2).sum(1).min())
        endd = min(arc[i], tot - arc[i]) if brk >= 0 else np.inf
        rows.append((endd, dev, win))
R = np.array(rows); endd, dev, win = R.T
print("samples", len(R), "drawn-vs-plain-spline deviation (world): median", np.median(dev).round(4), "p99", np.percentile(dev, 99).round(3))
for a, b in [(0, 0.5), (0.5, 1), (1, 1.5), (1.5, 2), (2, 4), (4, np.inf), (np.inf, np.inf + 1)]:
    m = (endd >= a) & (endd < b)
    if m.sum() == 0: continue
    print(f"  end [{a},{b}): n {m.sum():6d}  dev median {np.median(dev[m]):.4f}  dev>0.05 {(dev[m] > 0.05).mean():.3f}  win>45 {(win[m] > 45).sum():4d}")
sh = win > 45
print("sharp samples:", sh.sum(), " of them deviating > 0.05 world from the plain spline:", (sh & (dev > 0.05)).sum())
