# K1584 s4: framediff boxes -> sheet places (optionally inside a frame region, darker only, merged within 24 px).
#   python boxes2pl.py <diff.json> <out.json> [x0 y0 x1 y1] [--dark]
import sys, json, math
a = [s for s in sys.argv[1:] if not s.startswith('--')]; dark = '--dark' in sys.argv
B = json.load(open(a[0]))['boxes']; R = list(map(int, a[2:6])) if len(a) >= 6 else None
P = []
for b in sorted(B, key=lambda b: -b['px']):
    cx, cy = b['x'] + b['w'] / 2, b['y'] + b['h'] / 2
    if R and not (R[0] <= cx < R[2] and R[1] <= cy < R[3]): continue
    if dark and b['dLum'] >= 0: continue
    if any(math.hypot(p['x'] - cx, p['y'] - cy) < 24 for p in P): continue
    P.append({'name': f"x{b['cross']} {b['site']} dL{b['dLum']:+.0f} {b['px']}px", 'x': cx, 'y': cy})
json.dump(P, open(a[1], 'w')); print(a[1], len(P))
