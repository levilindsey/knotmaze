# K1482 s4: small ink components (dots/ticks) in a mirror_tiles json: size, centre offset, winKind/winA/chain histogram.
#   python small_ink.py <mir.json> <sites> [maxpx=25]
import json, sys
from collections import Counter
d = json.load(open(sys.argv[1])); mx = int(sys.argv[3]) if len(sys.argv) > 3 else 25
for nm in sys.argv[2].split(","):
    t = d[nm]; R = t["R"]; n = 2 * R; px = t["px"]
    ink = [p[0] >= 0.5 for p in px]; seen = [False] * len(px); out = []
    for i in range(len(px)):
        if not ink[i] or seen[i]: continue
        st = [i]; seen[i] = True; comp = []
        while st:
            j = st.pop(); comp.append(j); y, x = divmod(j, n)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < n and 0 <= xx < n:
                        k = yy * n + xx
                        if ink[k] and not seen[k]: seen[k] = True; st.append(k)
        if len(comp) <= mx and not any(j // n in (0, n - 1) or j % n in (0, n - 1) for j in comp):
            cy = sum(j // n for j in comp) / len(comp) - R; cx = sum(j % n for j in comp) / len(comp) - R
            h = Counter((px[j][3], px[j][4], px[j][2]) for j in comp).most_common(3)
            out.append(f"{len(comp)}px @({cx:+.0f},{cy:+.0f}) wk/wa/ch {h}")
    print(nm, "|", " ; ".join(out) or "-")
