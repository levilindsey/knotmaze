# K1584 s4: borders whose path/keep moved between two gapcheck bakes, with the nearest site.
#   python bdelta.py <a.json> <b.json> <sites_gf.json> [out_places.json]
import json, sys, math
A, B = (json.load(open(p)) for p in sys.argv[1:3]); S = json.load(open(sys.argv[3]))['sites']
ka = {(x['i'], b['dir'], b['lat']): (b, x) for x in A['crossings'] for b in x['borders']}
P = []
for x in B['crossings']:
    for b in x['borders']:
        a, _ = ka[(x['i'], b['dir'], b['lat'])]
        if a['path'] == b['path'] and abs((a['keepM'] or 0) - (b['keepM'] or 0)) < 0.02: continue
        pts = b['pts']; px, py = (pts[0], pts[1]) if pts else x['dev']
        s = min(S, key=lambda s: math.hypot(s['x'] - px, s['y'] - py)); d = math.hypot(s['x'] - px, s['y'] - py)
        print(f"x{x['i']} d{b['dir']:+d} l{b['lat']:+d} {a['path']}({a['keepM']}) -> {b['path']}({b['keepM']})  near {s['site']} {d:.0f}px")
        P.append({'name': f"x{x['i']} d{b['dir']:+d}l{b['lat']:+d} {s['site']}", 'x': px, 'y': py})
if len(sys.argv) > 4: json.dump(P, open(sys.argv[4], 'w'))
