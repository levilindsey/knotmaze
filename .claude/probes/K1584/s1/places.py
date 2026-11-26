# K1584 s1: pick crossings for a sheet from gapcheck's json of the BEFORE build, spread over the four kinds:
# self (kink loop self crossing), joint (a border takes the joint flag), near (scale / window / stolen: near a
# junction or tail), plain (all four borders take the full gap). Optional second json (after) marks changed ones.
#   python places.py <before.json> <out.json> [after.json] [perKind=8]
import sys, json
B = json.load(open(sys.argv[1]))['crossings']
A = json.load(open(sys.argv[3]))['crossings'] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
n = int(sys.argv[4]) if len(sys.argv) > 4 else 8
def kind(x):
    p = [b['path'] for b in x['borders']]
    if x['self']: return 'self'
    if 'flag' in p: return 'joint'
    if any(q in ('scale', 'window', 'stolen', 'none') for q in p): return 'near'
    return 'plain'
K = {}
for i, x in enumerate(B): K.setdefault(kind(x), []).append(i)
out = []
for k in ['plain', 'joint', 'near', 'self']:
    L = K.get(k, [])
    if A: # changed ones first for the kinds a fix touches, then unchanged, each spread over the maze
        ch = [i for i in L if [b['path'] for b in B[i]['borders']] != [b['path'] for b in A[i]['borders']]]
        un = [i for i in L if i not in ch]
        m = min(len(ch), n - min(2, len(un)))
        pick = [ch[int(j * len(ch) / m)] for j in range(m)] + [un[int(j * len(un) / (n - m))] for j in range(min(n - m, len(un)))]
    else:
        m = min(n, len(L)); pick = [L[int(j * len(L) / m)] for j in range(m)]
    for i in pick:
        fb = ''.join(b['path'][0] for b in B[i]['borders']); fa = ''.join(b['path'][0] for b in A[i]['borders']) if A else ''
        out.append({'name': f"x{i} {k} {fb}" + (f">{fa}" if A and fa != fb else ''), 'x': B[i]['dev'][0], 'y': B[i]['dev'][1]})
    print(k, len(L), 'picked', len(pick))
json.dump(out, open(sys.argv[2], 'w'))
