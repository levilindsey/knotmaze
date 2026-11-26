# K1584 s10: where a ball's gap runs. Samples gf_b2.png (raw gray, bilinear) on rings around a device point and prints,
# per radius, the angular runs lighter than the ink/paper midpoint (degrees, 0 = +x, 90 = +y, screen down), with each
# run's arc length in px. Several captures side by side by label.
#   python ring.py <cx> <cy> <r1,r2,...> <label=capDir>... [--ink 18] [--paper 42] [--from a0 --to a1]
import sys, os, math
import numpy as np
from PIL import Image
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
def bil(g, x, y):
    x0, y0 = int(math.floor(x)), int(math.floor(y)); fx, fy = x - x0, y - y0
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx; b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy
def main():
    cx, cy = float(sys.argv[1]), float(sys.argv[2]); rs = [float(v) for v in sys.argv[3].split(',')]
    caps = [a.split('=', 1) for a in sys.argv[4:] if '=' in a and not a.startswith('--')]
    ink = float(arg('--ink', 18)); paper = float(arg('--paper', 42)); mid = 0.5 * (ink + paper)
    a0 = float(arg('--from', 0)); a1 = float(arg('--to', 360))
    for lab, d in caps:
        g = np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.float64)
        print('==', lab)
        for r in rs:
            angs = np.arange(a0, a1, 0.5)
            v = np.array([bil(g, cx + r * math.cos(math.radians(a)) - 0.5, cy + r * math.sin(math.radians(a)) - 0.5) for a in angs])
            on = v > mid; runs = []; i = 0
            while i < len(angs):
                if on[i]:
                    j = i
                    while j + 1 < len(angs) and on[j + 1]: j += 1
                    runs.append((angs[i], angs[j], (angs[j] - angs[i] + 0.5) * math.pi / 180 * r))
                    i = j + 1
                else: i += 1
            print('r %5.1f  ' % r + '  '.join('%.1f..%.1f (%.1f px)' % t for t in runs))
if __name__ == '__main__': main()
