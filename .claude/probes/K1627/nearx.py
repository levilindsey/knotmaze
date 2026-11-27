# K1627 s3: crossings nearest a junction (the true gaps that could reach a corner), in device px of a capture.
#   python nearx.py <capture dir> [n]
import json, sys, math
D = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 12
sc = json.load(open(D + '/scene_gf.json')); T = sc['camera']['worldToCss']; dpr = sc['camera']['dpr']
ch = {c['id']: c for c in sc['chains']}
def at(cid, s):
    p = ch[cid]['pts']; acc = 0.0
    for i in range(len(p) // 2 - 1):
        x0, y0, x1, y1 = p[2*i], p[2*i+1], p[2*i+2], p[2*i+3]; l = math.hypot(x1 - x0, y1 - y0)
        if acc + l >= s and l > 0: t = (s - acc) / l; return (x0 + t * (x1 - x0), y0 + t * (y1 - y0))
        acc += l
    return (p[-2], p[-1])
dev = lambda w: ((T[0] * w[0] + T[2] * w[1] + T[4]) * dpr, (T[1] * w[0] + T[3] * w[1] + T[5]) * dpr)
J = [(j['id'], j['c'], {a['chain'] for a in j['arms']}) for j in sc['junctions']]
out = []
for k, x in enumerate(sc['crossings']):
    w = at(x['a']['chain'], x['a']['s'])
    dj, jid, jc = min((math.hypot(w[0] - c[0], w[1] - c[1]), i, c) for i, c, cs in J)
    o = x[x['over']]['chain']; u = x['b' if x['over'] == 'a' else 'a']['chain']
    out.append((dj, k, jid, o, u, dev(w)))
out.sort()
for dj, k, jid, o, u, p in out[:n]: print(f'x{k} over {o} under {u}  {jid} at {dj:.3f} world  dev ({p[0]:.0f},{p[1]:.0f})')
