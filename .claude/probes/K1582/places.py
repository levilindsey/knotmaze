# K1582 (27Z5) Done 4: places where two builds' border frames differ.
#   python places.py <a.png> <b.png>
# A place is a 24x24 device-px cell holding a changed pixel (luminance step
# >= 1, the all-maze tool's listing step), merged with its 8 neighbours into
# one place while they touch (analyze_maze.py's grouping, restated). Gain =
# b's luminance over a's (ink gained: a gap closed, the spots' direction).
# Prints the place counts and the three largest places of each kind.
import sys
import numpy as np
from PIL import Image
def lum(p):
    a = np.asarray(Image.open(p).convert("RGB")).astype(int)
    return (299 * a[:, :, 0] + 587 * a[:, :, 1] + 114 * a[:, :, 2]) // 1000
A, B = lum(sys.argv[1]), lum(sys.argv[2])
STEP = int(sys.argv[3]) if len(sys.argv) > 3 else 1
diff = B - A
for name, mask in (("any", np.abs(diff) >= STEP), ("gain", diff >= STEP)):
    ys, xs = np.nonzero(mask)
    cells = {}
    for y, x in zip(ys.tolist(), xs.tolist()):
        k = (y // 24, x // 24)
        cells.setdefault(k, []).append((x, y, int(diff[y, x])))
    seen, places = set(), []
    for k in cells:
        if k in seen: continue
        stack, comp = [k], []
        seen.add(k)
        while stack:
            c = stack.pop(); comp.append(c)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (c[0] + dy, c[1] + dx)
                    if n in cells and n not in seen: seen.add(n); stack.append(n)
        px = [p for c in comp for p in cells[c]]
        places.append((len(px), sum(abs(p[2]) for p in px) / max(len(px), 1),
                       sum(p[0] for p in px) / len(px), sum(p[1] for p in px) / len(px)))
    places.sort(reverse=True)
    print(f"{name}: {len(places)} places, {int(mask.sum())} px")
    for n, mean, mx, my in places[:3]:
        print(f"  largest: {n} px at device {mx:.0f},{my:.0f} (mean step {mean:+.1f})")
    top = sorted(cells.items(), key=lambda kv: -len(kv[1]))[:3]
    print(f"  cells: {len(cells)}")
    for (cy, cx), px in top:
        print(f"  largest cell: {len(px)} px at device {cx * 24 + 12},{cy * 24 + 12}")
