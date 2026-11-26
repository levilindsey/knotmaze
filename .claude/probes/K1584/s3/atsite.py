import json, sys, math
J = json.load(open(sys.argv[1])); R = J['rooms']; rows = {R[i]: R[i:i+11] for i in range(0, len(R), 11)}
C = J['corn']; corn = {(C[i], C[i+1], C[i+2]): C[i+3] for i in range(0, len(C), 4)}
S = {s['site']: s for s in json.load(open(sys.argv[2]))['sites']}
for nm in sys.argv[3].split(','):
    s = S[nm]; print('==', nm, s['kind'], round(s['x']), round(s['y']))
    for x in J['crossings']:
        for b in x['borders']:
            P = b['pts']
            if not P: continue
            dm = min(math.hypot(P[k] - s['x'], P[k+1] - s['y']) for k in range(0, len(P), 4))
            if dm < 45:
                r = rows[x['i']]; d = b['dir']
                print(f"  x{x['i']} u{x['under']} o{x['over']} dir{d:+d} lat{b['lat']:+d} {b['path']:6s} keep{b['keepM']} dist{dm:.0f}px jRoom{(r[1] if d<0 else r[2]):.2f} need{(r[5] if d<0 else r[6]):.2f} corner{corn[(x['i'], d, b['lat'])]:.2f} ms{(r[7] if d<0 else r[9]):.2f} fs{(r[8] if d<0 else r[10]):.2f} memO{b['memO']} dUm{b['dUm']} dOm{b['dOm']}")
