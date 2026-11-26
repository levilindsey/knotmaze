# K1584 s11: the three wedge balls' gap widths and the ink left across or past the wedge's outer end, per capture.
#   python wid11.py <label=capDir> ...   (capDir holds A_3/A_5/A_6/gf_b2.png; a bare name is s11/out/<name>)
# Width: the gap tool of the gap worktree's s10/wid.py (copied): the light run across the wedge's axis at t px from the
# ball's centre (raw gray above the ink/paper midpoint, --ink 20 --paper 30), at t = 0.5R .. 3R and 3.5R, 4R.
# Ink across: axis length (px) in [R, 4R] where that run is 0 (the gap closed across), sampled every 0.25 px.
# Ink past: pixels within 8 px of the axis, at t in [R, 2R], [2R, 3R] and [3R, 4R] (the corner list reaches about 1.58R), darker here than the
# ordinary gap's (stage 5, s5d) by more than 3 levels (the gap's seam is only 26-28 against ink 18-20 at k176). Target 0 past 3R (the wedge ends at 3R and runs open into s5d's gap).
import sys, os
import numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
GAP = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584'
S5D = os.path.join(GAP, 's5', 'out', 's5d')
BALLS = [('A_3', 63, 1056.0, 266.1, 6.47, -0.9925, -0.1219), ('A_5', 176, 2343.7, 507.6, 6.45, -0.1908, 0.9816),
         ('A_6', 265, 2304.5, 815.5, 8.45, 0.9063, -0.4226)]
INK, PAPER = 20.0, 30.0
def load(d, m): return np.asarray(Image.open(os.path.join(d, m, 'gf_b2.png')).convert('L')).astype(np.float64)
def bil(g, x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx; b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy
def width(g, cx, cy, dx, dy, t, reach=9.0, step=0.05):
    nx, ny = -dy, dx; px, py = cx + dx * t - 0.5, cy + dy * t - 0.5
    s = np.arange(-reach, reach + step / 2, step)
    v = np.array([bil(g, px + nx * u, py + ny * u) for u in s])
    mid = 0.5 * (INK + PAPER); on = v > mid; near = np.abs(s) <= 1.5
    if not on[near].any(): return 0.0
    i0 = int(np.argmax(np.where(near, v, -1e9))); a = i0
    while a > 0 and on[a - 1]: a -= 1
    b = i0
    while b < len(s) - 1 and on[b + 1]: b += 1
    lo = s[a] if a == 0 else s[a - 1] + step * (mid - v[a - 1]) / (v[a] - v[a - 1])
    hi = s[b] if b == len(s) - 1 else s[b] + step * (v[b] - mid) / (v[b] - v[b + 1])
    return float(hi - lo)
def view(d, m):
    try: return open(os.path.join(d, m, 'gf_b2view.txt')).readline().strip()
    except OSError: return '?'
cols = []
for a in sys.argv[1:]:
    lab, d = a.split('=', 1) if '=' in a else (a, a)
    if not os.path.isabs(d): d = os.path.join(O, d) if os.path.isdir(os.path.join(O, d)) else os.path.join(GAP, d)
    cols.append((lab, d))
out = []
for m, k, cx, cy, R, dx, dy in BALLS:
    ref = load(S5D, m); H, W = ref.shape
    ys, xs = np.mgrid[int(cy - 5 * R):int(cy + 5 * R), int(cx - 5 * R):int(cx + 5 * R)]
    t = (xs + 0.5 - cx) * dx + (ys + 0.5 - cy) * dy; p = np.abs(-(xs + 0.5 - cx) * dy + (ys + 0.5 - cy) * dx)
    ts = [f * R for f in (0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4)]
    out.append('\n== %s k%d  R %.2f px  centre (%.1f, %.1f)  axis (%.4f, %.4f)  view s5d %s' % (m, k, R, cx, cy, dx, dy, view(S5D, m)))
    out.append('%-10s ' % 'capture' + ' '.join('%6s' % ('%.1fR' % (x / R)) for x in ts) + '  | closed R..4R px | darker than s5d: R..2R 2R..3R 3R..4R | view')
    for lab, d in [('s5d', S5D)] + cols:
        g = load(d, m)
        ws = [width(g, cx, cy, dx, dy, x) for x in ts]
        tt = np.arange(R, 4 * R, 0.25); closed = 0.25 * sum(1 for x in tt if width(g, cx, cy, dx, dy, x) == 0)
        sub = g[ys, xs]; drk = sub < ref[ys, xs] - 3
        b0 = int(((t >= R) & (t < 2 * R) & (p <= 8) & drk).sum()); b1 = int(((t >= 2 * R) & (t < 3 * R) & (p <= 8) & drk).sum()); b2 = int(((t >= 3 * R) & (t < 4 * R) & (p <= 8) & drk).sum())
        out.append('%-10s ' % lab + ' '.join('%6.2f' % w for w in ws) + '  | %5.2f           | %5d  %5d  %5d  | %s' % (closed, b0, b1, b2, 'same' if view(d, m) == view(S5D, m) else view(d, m)))
txt = '\n'.join(out)
print(txt)
open(os.path.join(O, 'wid11_%s.txt' % '_'.join(c[0] for c in cols)), 'w').write(txt + '\n')
