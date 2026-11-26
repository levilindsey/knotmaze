# K1584 s4: closed (and reads-closed) borders of one maze as sheet places, by kind:
#   nofit = a corner on that border before the border leaves the over (corner <= sExit); ctrl = no corner on that border
#   within 1.5 (the joint ctrl's room closed it); near = a corner within 1.5 past the exit
#   python closedpl.py <maze> <out.json> [kind]
import json, sys
m, op = sys.argv[1], sys.argv[2]; want = sys.argv[3] if len(sys.argv) > 3 else None
J = json.load(open(f'cnt/{m}_s4.json')); C = J['corn']; corn = {(C[i], C[i+1], C[i+2]): C[i+3] for i in range(0, len(C), 4)}
P = []; K = {}
for x in J['crossings']:
    for b in x['borders']:
        if b['path'] != 'closed': continue
        c = corn[(x['i'], b['dir'], b['lat'])]; s = b['sExit']
        k = 'nofit' if c <= s else ('ctrl' if c > 1.5 else 'near')
        K[k] = K.get(k, 0) + 1
        if want and k != want: continue
        pt = b['pts']; px, py = (pt[0], pt[1]) if pt else x['dev']
        P.append({'name': f"x{x['i']} d{b['dir']:+d} l{b['lat']:+d} {k} c{c:.2f} s{s:.2f}", 'x': px, 'y': py})
json.dump(P, open(op, 'w')); print(m, K, len(P))
