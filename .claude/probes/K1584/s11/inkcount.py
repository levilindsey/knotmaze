# K1584 s11: a ball's inked pixels: pixels of gf_b2.png whose centre lies within R device px of the ball's centre,
# and of them those darker than a threshold (raw gray). Several captures by label; per threshold.
#   python inkcount.py <cx> <cy> <R> <label=capDir>... [--th 20,25,30]
import sys, os
import numpy as np
from PIL import Image
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
def main():
    cx, cy, R = map(float, sys.argv[1:4])
    caps = [a.split('=', 1) for a in sys.argv[4:] if '=' in a and not a.startswith('--')]
    ths = [float(t) for t in arg('--th', '20,25,30').split(',')]
    for lab, d in caps:
        g = np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.float64)
        ys, xs = np.mgrid[0:g.shape[0], 0:g.shape[1]]
        m = (xs + 0.5 - cx) ** 2 + (ys + 0.5 - cy) ** 2 <= R * R
        v = g[m]
        print('%-10s disk %d  ' % (lab, m.sum()) + '  '.join('<%g: %d' % (t, (v < t).sum()) for t in ths) + '  mean %.1f' % v.mean())
if __name__ == '__main__': main()
