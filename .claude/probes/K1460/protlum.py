# K1460 s5: luminance at each protect site (prot_3.json's css points, 5x5 device px) at each fade over the same mode at fade 0.
#   python protlum.py <shot dir> <modes,...> <fades,...> <prot json> <n sites>
import json, sys
import numpy as np
from PIL import Image
d = sys.argv[1]; tags = sys.argv[2].split(','); fls = sys.argv[3].split(','); js = json.load(open(sys.argv[4])); n = int(sys.argv[5])
L = {}
def lum(t, f):
    k = (t, f)
    if k not in L: L[k] = np.asarray(Image.open(f"{d}/shot_{t}_{f}.png").convert("RGB"), dtype=np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    return L[k]
print("site".ljust(12), " ".join(f"{t}@{f}".rjust(12) for f in fls[1:] for t in tags))
for s in js["sites"][:n]:
    x, y = s["css"]; X, Y = 2 * x, 2 * y
    row = []
    for f in fls[1:]:
        for t in tags:
            a = lum(t, f)[Y-2:Y+3, X-2:X+3].mean(); b = lum(t, fls[0])[Y-2:Y+3, X-2:X+3].mean()
            row.append(a / max(b, 1))
    print(f"{x},{y}".ljust(12), " ".join(f"{v:12.2f}" for v in row))

