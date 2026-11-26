import json, sys, math
# usage: atsite4.py <cnt.json> <sites_gf.json> <site,site> [radius=45]
J = json.load(open(sys.argv[1])); S = {s['site']: s for s in json.load(open(sys.argv[2]))['sites']}
C = J.get('corn', []); corn = {(C[i], C[i+1], C[i+2]): C[i+3] for i in range(0, len(C), 4)}
rad = float(sys.argv[4]) if len(sys.argv) > 4 else 45
for nm in sys.argv[3].split(','):
    s = S[nm]; print('==', nm, s['kind'], round(s['x']), round(s['y']))
    for x in J['crossings']:
        for b in x['borders']:
            P = b['pts']
            if not P: continue
            dm = min(math.hypot(P[k] - s['x'], P[k+1] - s['y']) for k in range(0, len(P), 4))
            if dm < rad:
                print(f"  x{x['i']} d{b['dir']:+d} l{b['lat']:+d} {b['path']:8s} ms{b['ms'] or 1:.2f} fs{b['fs'] or 1:.2f} dOm{b.get('dOm',9):.2f} keep{b.get('keepM',0):.2f} sExit{b.get('sExit',0):.2f} corn{corn.get((x['i'], b['dir'], b['lat']), 9):.2f} dist{dm:.0f}")
