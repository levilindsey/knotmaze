# K1474 interiors, strict: like interiors.py but the interior also requires flatness over 15x15
# (< 12 levels in both frames: a long crossing fade's shoulder is not flat at that scale) and at most
# ONE of today's plateau colours in 31x31 (a crossing or fan has two). Prints any >6 clusters.
#   python interiors2.py <dir> <fl>
import sys
import numpy as np
from PIL import Image

d0, fl = sys.argv[1], sys.argv[2]

def load(tag):
    return np.asarray(Image.open(f"{d0}/shot_{tag}_{fl}.png").convert("RGB")).astype(int)

def erode(m, n):
    for _ in range(n):
        p = np.pad(m, 1, mode="constant")
        m = p[1:-1, 1:-1] & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    return m

def winmax1d(a, k, axis):
    p = k // 2
    pad = [(0, 0), (0, 0)]
    pad[axis] = (p, p)
    P = np.pad(a, pad, mode="edge")
    out = None
    for s in range(k):
        sl = [slice(None), slice(None)]
        sl[axis] = slice(s, s + a.shape[axis])
        v = P[tuple(sl)]
        out = v if out is None else np.maximum(out, v)
    return out

def win(a, k, fn):
    if fn is np.maximum:
        return winmax1d(winmax1d(a, k, 0), k, 1)
    return -winmax1d(winmax1d(-a.astype(float), k, 0), k, 1)

today = load("today")
bg = np.array([21, 27, 40])
lum = lambda a: a.mean(axis=2)
ink_t = np.abs(today - bg).max(axis=2) > 24
flat5_t = (win(lum(today), 5, np.maximum) - win(lum(today), 5, np.minimum)) < 12
flat15_t = (win(lum(today), 15, np.maximum) - win(lum(today), 15, np.minimum)) < 12
cols, counts = np.unique(today[ink_t & flat5_t].reshape(-1, 3), axis=0, return_counts=True)
plats = cols[counts >= 200]
idx = np.full(today.shape[:2], -1, int)
sel = ink_t & flat5_t
sub = today[sel].astype(float)
lab = np.full(len(sub), -1, int)
P = plats.astype(float)
for i in range(0, len(sub), 200000):
    ch = sub[i:i + 200000]
    d = np.abs(ch[:, None, :] - P[None, :, :]).max(axis=2)
    am = d.argmin(axis=1)
    lab[i:i + len(ch)] = np.where(d.min(axis=1) <= 4, am, -1)
idx[sel] = lab
H, W = idx.shape
cnt = np.zeros((H, W), int)
for v in range(len(plats)):
    b = (idx == v).astype(np.int32)
    ii = np.zeros((H + 1, W + 1), np.int64)
    ii[1:, 1:] = np.cumsum(np.cumsum(b, 0), 1)
    r = 15
    y0 = np.clip(np.arange(H) - r, 0, H); y1 = np.clip(np.arange(H) + r + 1, 0, H)
    x0 = np.clip(np.arange(W) - r, 0, W); x1 = np.clip(np.arange(W) + r + 1, 0, W)
    s = ii[y1][:, x1] - ii[y0][:, x1] - ii[y1][:, x0] + ii[y0][:, x0]
    cnt += s > 0

def interior(other):
    ink_o = np.abs(other - bg).max(axis=2) > 24
    flat5_o = (win(lum(other), 5, np.maximum) - win(lum(other), 5, np.minimum)) < 12
    flat15_o = (win(lum(other), 15, np.maximum) - win(lum(other), 15, np.minimum)) < 12
    return erode(ink_t & ink_o, 3) & flat15_t & flat15_o & (cnt <= 1)

def report(name, other, m):
    d = np.abs(today - other)
    dm = d[m]
    print(f"== {name}: strict interior px {int(m.sum())} max {dm.max()} mean {dm.mean(axis=0).round(3)}")
    ys, xs = np.where(m & (d.max(axis=2) > 6))
    print(f"   px>6: {len(xs)}")
    pts = sorted(zip(xs.tolist(), ys.tolist()))
    clusters = []
    for x, y in pts:
        for c in clusters:
            if abs(x - c[0]) <= 14 and abs(y - c[1]) <= 14:
                c[2].append((x, y)); break
        else:
            clusters.append([x, y, [(x, y)]])
    for cx, cy, mem in sorted(clusters, key=lambda c: -len(c[2]))[:10]:
        x, y = mem[0]
        print(f"   cluster n={len(mem)} device ({cx},{cy}) css ({cx//2},{cy//2}): today {today[y, x]} other {other[y, x]} diff {d[y, x]}")

for name in ["gf", "gfh", "today2"]:
    try:
        o = load(name)
    except FileNotFoundError:
        continue
    report(name, o, interior(o))
