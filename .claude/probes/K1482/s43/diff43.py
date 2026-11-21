# K1482 s43: where a variant changes the mirror against switch-off: counts and a map (grey = off ink, red = ink
# added, green = ink removed, blue = coverage added with ink unchanged).
#   python diff43.py <dir> <name> <x0> <y0> <N> <variant...>
import sys
import numpy as np
from PIL import Image

d, name, x0, y0, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
A = np.fromfile(f"{d}/{name}_off_{x0}_{y0}_{n}.f32", dtype=np.float32).reshape(n, n, 3)
for v in sys.argv[6:]:
    B = np.fromfile(f"{d}/{name}_{v}_{x0}_{y0}_{n}.f32", dtype=np.float32).reshape(n, n, 3)
    di = B[..., 0] - A[..., 0]; dc = B[..., 1] - A[..., 1]
    ch = (np.abs(di) > 0.05) | (np.abs(dc) > 0.05)
    ys, xs = np.nonzero(ch)
    bb = f"{xs.min() + x0}..{xs.max() + x0} x {ys.min() + y0}..{ys.max() + y0}" if len(xs) else "-"
    print(f"{name} {v}: changed {len(xs)} (ink+ {(di > 0.05).sum()}, ink- {(di < -0.05).sum()}, cov- {(dc < -0.05).sum()}), bbox {bb}")
    img = np.full((n, n, 3), 255, np.uint8); img[A[..., 0] > 0.5] = (180, 180, 180)
    img[(dc > 0.05) & (np.abs(di) <= 0.05)] = (0, 0, 255); img[di > 0.05] = (220, 0, 0); img[di < -0.05] = (0, 160, 0)
    Image.fromarray(img).save(f"{d}/{name}_{v}_diff.png")
