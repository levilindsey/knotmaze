# K1626 s2: table.py for N census dirs (census.ts outputs): per maze, the
# closest joint-to-crossing, counts under 2 / 2.5 w, max and p99 segment
# stretch (rest >= 0.4), sharp turns (> 60 deg), time to sleep.
#   python table3.py <dir1> <dir2> ... (labels = the dir names)
import json, math, os, sys
names = ['L'] + ['D_' + c for c in '123456789a']
def stats(S):
    pos = S['positions']; P = lambda i: (pos[2*i], pos[2*i+1])
    stretch = []; sharp = 0
    for c, ch in enumerate(S['chains']):
        brk = S['brk'][c]; n = len(ch); rs = S['rests'][c]
        for k in range(n):
            if k == brk or rs[k] is None or rs[k] <= 0: continue
            a, b = P(ch[k]), P(ch[(k+1) % n])
            if rs[k] >= 0.4: stretch.append(math.dist(a, b) / rs[k])
        for k in range(n):
            if brk >= 0 and (k == brk or (k - 1) % n == brk or k == 0 and brk == n-1): continue
            p0, p1, p2 = P(ch[(k-1) % n]), P(ch[k]), P(ch[(k+1) % n])
            v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
            n1, n2 = math.hypot(*v1), math.hypot(*v2)
            if n1 < 1e-9 or n2 < 1e-9: continue
            if (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2) < 0.5: sharp += 1
    stretch.sort()
    return stretch[-1], stretch[int(len(stretch)*0.99)], sharp
dirs = sys.argv[1:]
print('name | ' + ' | '.join(f'{os.path.basename(d)}: min <2w <2.5w maxStr p99 sharp60 sleep' for d in dirs))
for n in names:
    row = [n]
    for d in dirs:
        S = json.load(open(f'{d}/{n}.json'))
        ds = [x['dw'] for x in S['near']]
        mx, p99, sh = stats(S)
        row.append(f"{min(ds):.2f} {sum(x<2 for x in ds):3d} {sum(x<2.5 for x in ds):3d} {mx:.2f} {p99:.3f} {sh:3d} {S['sleep']:.1f}")
    print(' | '.join(row))
