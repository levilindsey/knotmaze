# K1395 s1: coloured-interior extents of two shots (the FX colour, not the near-grey borders and background):
# a pixel is "coloured" when max - min channel > T and max > 60. Prints counts in each and the XOR.
#   python sat.py <a.png> <b.png> [T=40] [diff.png]
import sys
from PIL import Image

a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
T = int(sys.argv[3]) if len(sys.argv) > 3 else 40
out = sys.argv[4] if len(sys.argv) > 4 else None
W, H = a.size
pa, pb = a.load(), b.load()
na = nb = only_a = only_b = 0
both = sum_d = over24 = 0
d = Image.new("RGB", (W, H), (0, 0, 0)) if out else None
pd = d.load() if d else None
for y in range(H):
    for x in range(W):
        ra = pa[x, y]; rb = pb[x, y]
        ca = max(ra) - min(ra) > T and max(ra) > 60
        cb = max(rb) - min(rb) > T and max(rb) > 60
        na += ca; nb += cb
        if ca and not cb:
            only_a += 1
            if pd: pd[x, y] = (255, 60, 60)
        elif cb and not ca:
            only_b += 1
            if pd: pd[x, y] = (60, 160, 255)
        elif ca and cb:
            both += 1
            dm = max(abs(ra[i] - rb[i]) for i in range(3))
            sum_d += dm
            over24 += dm > 24
            if pd: pd[x, y] = (90, 90, 90)
print(f"coloured a {na} b {nb} only_a {only_a} only_b {only_b} | both {both}: mean max-channel diff {sum_d / max(both, 1):.1f}, over 24: {over24}")
if d:
    d.save(out)
