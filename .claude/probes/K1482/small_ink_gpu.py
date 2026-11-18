import json, sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int); S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
R = 24; thr = float(sys.argv[4]) if len(sys.argv) > 4 else 0
for nm in sys.argv[3].split(","):
    s = S[nm]; cx, cy = round(s["x"]), round(s["y"]); C = im[cy - R:cy + R, cx - R:cx + R]
    L = C.sum(axis=2)
    if nm == sys.argv[3].split(",")[0]: print("lum pctiles", np.percentile(L, [1, 5, 25, 50, 75, 95]))
    ink = L < thr; n = 2 * R; seen = np.zeros_like(ink); out = []
    for y in range(n):
        for x in range(n):
            if not ink[y, x] or seen[y, x]: continue
            st = [(y, x)]; seen[y, x] = True; comp = []
            while st:
                a, b = st.pop(); comp.append((a, b))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = a + dy, b + dx
                        if 0 <= yy < n and 0 <= xx < n and ink[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
            if len(comp) <= 30 and not any(a in (0, n - 1) or b in (0, n - 1) for a, b in comp):
                out.append(f"{len(comp)}px @({sum(b for a,b in comp)/len(comp)-R:+.0f},{sum(a for a,b in comp)/len(comp)-R:+.0f})")
    print(nm, "|", " ; ".join(out) or "-")
