# K1584 s10: on-screen width of a crossing gap where it crosses a line (device px of gf_b2.png). The gap reads LIGHT
# (paper) against the dark outline/ball ink. Along a segment perpendicular to the wedge's axis at distance t (device px)
# from the ball's centre, the width is the length of the light run (raw gray above the midpoint of the ink and paper
# levels, linear sub-pixel ends) that holds the axis point or the lightest point within 1.5 px of it; 0 when none.
#   python wid.py <capDir> <cx> <cy> <dx> <dy> <t1,t2,...> [--ink 18] [--paper 42] [--dump]
# dx, dy: the axis's direction from the centre (normalised here). Prints one line per t: t, width, the run's ends.
import sys, os, json
import numpy as np
from PIL import Image
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
def load(d):
    return np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.float64)
def bil(g, x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx; b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy
def width(g, cx, cy, dx, dy, t, ink=18.0, paper=42.0, reach=9.0, step=0.05):
    n = np.hypot(dx, dy); dx, dy = dx / n, dy / n; nx, ny = -dy, dx
    # pixel centres: gf_b2.png pixel (i, j) covers [i, i+1); its value sits at i + 0.5 in these coordinates
    px, py = cx + dx * t - 0.5, cy + dy * t - 0.5
    s = np.arange(-reach, reach + step / 2, step)
    v = np.array([bil(g, px + nx * u, py + ny * u) for u in s])
    mid = 0.5 * (ink + paper); on = v > mid
    near = np.abs(s) <= 1.5
    if not on[near].any(): return 0.0, None, None, float(v[near].max())
    i0 = int(np.argmax(np.where(near, v, -1e9)))
    a = i0
    while a > 0 and on[a - 1]: a -= 1
    b = i0
    while b < len(s) - 1 and on[b + 1]: b += 1
    lo = s[a] if a == 0 else s[a - 1] + step * (mid - v[a - 1]) / (v[a] - v[a - 1])
    hi = s[b] if b == len(s) - 1 else s[b] + step * (v[b] - mid) / (v[b] - v[b + 1])
    return float(hi - lo), float(lo), float(hi), float(v[i0])
def main():
    d = sys.argv[1]; cx, cy, dx, dy = map(float, sys.argv[2:6]); ts = [float(x) for x in sys.argv[6].split(',')]
    g = load(d); ink = float(arg('--ink', 18)); paper = float(arg('--paper', 42))
    out = []
    for t in ts:
        w, lo, hi, pk = width(g, cx, cy, dx, dy, t, ink, paper)
        out.append({'t': t, 'w': round(w, 2), 'lo': lo and round(lo, 2), 'hi': hi and round(hi, 2), 'peak': round(pk, 1)})
        print('t %5.2f  width %5.2f px  run %s..%s  peak %.1f' % (t, w, out[-1]['lo'], out[-1]['hi'], pk))
    if '--dump' in sys.argv: print(json.dumps(out))
if __name__ == '__main__': main()
