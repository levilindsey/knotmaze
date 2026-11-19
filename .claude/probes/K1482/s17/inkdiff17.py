import sys, json, numpy as np
from PIL import Image
A0 = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int).sum(2)
B0 = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int).sum(2)
a = A0 <= 73; b = B0 <= 73
HI = int(sys.argv[5]) if len(sys.argv) > 5 else 120
S = json.load(open(sys.argv[3])); sites = [(s["site"], s["x"], s["y"]) for s in S["sites"]]
gain = b & (A0 >= HI); loss = a & (B0 >= HI)
print("ink A", a.sum(), "B", b.sum(), "B gains", gain.sum(), "B loses", loss.sum())
C = int(sys.argv[4]) if len(sys.argv) > 4 else 12
H, W = a.shape
cells = {}
for name, m in (("gain", gain), ("loss", loss)):
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        cells.setdefault((y // C, x // C), [0, 0])[0 if name == "gain" else 1] += 1
# merge adjacent cells into clusters
seen = set(); out = []
for c in cells:
    if c in seen: continue
    st = [c]; seen.add(c); grp = []
    while st:
        q = st.pop(); grp.append(q)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                n = (q[0] + dy, q[1] + dx)
                if n in cells and n not in seen: seen.add(n); st.append(n)
    g = sum(cells[q][0] for q in grp); l = sum(cells[q][1] for q in grp)
    cy = int(np.mean([q[0] for q in grp]) * C + C / 2); cx = int(np.mean([q[1] for q in grp]) * C + C / 2)
    s = min(sites, key=lambda s: (s[1] - cx) ** 2 + (s[2] - cy) ** 2); d = ((s[1] - cx) ** 2 + (s[2] - cy) ** 2) ** .5
    out.append((g + l, g, l, cx, cy, s[0], int(d)))
out.sort(reverse=True)
for r in out: print(f"tot {r[0]:4d} gain {r[1]:4d} loss {r[2]:4d} at {r[3]},{r[4]} near {r[5]} ({r[6]})")

