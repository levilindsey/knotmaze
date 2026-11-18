# K1474 Done 1: thread-interior colour difference, today vs gf (and gfh).
# Interior = at least 3 px inside BOTH renderers' ink (eroded ink intersection), locally flat in both
# (5x5 luminance range < 12: no edge, border rim or fade ramp), and at most 2 of today's plateau colours
# in a 31x31 neighbourhood (keeps junction fans and crossing overlaps out). Groups pixels by today's
# exact colour (the section colour), counts >= 50 only, prints max/mean channel difference per group.
#   python interiors.py <dir> <fl>
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
    # separable sliding maximum along one axis, edge-padded
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
    # minimum via negated maximum
    return -winmax1d(winmax1d(-a.astype(float), k, 0), k, 1)

def plateau_colors(a, mask):
    cols, counts = np.unique(a[mask].reshape(-1, 3), axis=0, return_counts=True)
    return cols[counts >= 200]

today = load("today")
bg = np.array([21, 27, 40])
lum = lambda a: a.mean(axis=2)
ink_t = np.abs(today - bg).max(axis=2) > 24
flat_t = (win(lum(today), 5, np.maximum) - win(lum(today), 5, np.minimum)) < 12
plats = plateau_colors(today, ink_t & flat_t)
print(f"plateau colours: {len(plats)}")

# label flat ink pixels by nearest plateau colour (exact, <=4 levels)
idx = np.full(today.shape[:2], -1, int)
if len(plats):
    sel = ink_t & flat_t
    sub = today[sel].astype(float)
    lab = np.full(len(sub), -1, int)
    P = plats.astype(float)
    for i in range(0, len(sub), 200000):
        ch = sub[i:i + 200000]
        d = np.abs(ch[:, None, :] - P[None, :, :]).max(axis=2)
        am = d.argmin(axis=1)
        lab[i:i + len(ch)] = np.where(d.min(axis=1) <= 4, am, -1)
    idx[sel] = lab
    # distinct plateau count in 31x31 via integral images (exact, fast)
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
else:
    cnt = np.zeros(today.shape[:2], int)

def interior(other):
    ink_o = np.abs(other - bg).max(axis=2) > 24
    flat_o = (win(lum(other), 5, np.maximum) - win(lum(other), 5, np.minimum)) < 12
    return erode(ink_t & ink_o, 3) & flat_t & flat_o & (cnt <= 2)

def report(name, other, m):
    d = np.abs(today - other)
    dm = d[m]
    print(f"== {name}: interior px {int(m.sum())}")
    print(f"   overall max {dm.max():.0f}, per-ch max {dm.max(axis=0)}, mean {dm.mean(axis=0).round(2)}")
    cols, inv, counts = np.unique(today[m].reshape(-1, 3), axis=0, return_inverse=True, return_counts=True)
    dd = d[m]
    oo = other[m]
    rows = []
    for i, c in enumerate(cols):
        if counts[i] < 50:
            continue
        sel = inv == i
        rows.append((int(counts[i]), tuple(int(x) for x in c), int(dd[sel].max()), float(dd[sel].mean(axis=0).max()),
                     tuple(int(round(x)) for x in oo[sel].mean(axis=0)), tuple(int(round(x)) for x in dd[sel].mean(axis=0))))
    rows.sort(reverse=True)
    for n, c, mx, mn, oc, dc in rows[:14]:
        print(f"   today {c} n={n}: max {mx} mean {mn:.2f} | {name} mean {oc} diffmean {dc}")
    return dm

for name in ["gf", "gfh", "today2"]:
    try:
        o = load(name)
    except FileNotFoundError:
        print(f"== {name}: not captured")
        continue
    report(name, o, interior(o))
