import json, math
def look(d, n):
    S = json.load(open(f'{d}/{n}.json')); pos = S['positions']; P = lambda i: (pos[2*i], pos[2*i+1])
    J = [(j['x'], j['y']) for j in S['juncs']]
    top = []; sharp = []
    for c, ch in enumerate(S['chains']):
        brk = S['brk'][c]; nn = len(ch); rs = S['rests'][c]
        for k in range(nn):
            if k == brk or rs[k] is None or rs[k] <= 0: continue
            a, b = P(ch[k]), P(ch[(k+1) % nn]); L = math.dist(a, b)
            m = ((a[0]+b[0])/2, (a[1]+b[1])/2); dj = min(math.dist(m, j) for j in J)
            top.append((L / rs[k], rs[k], c, k, round(m[0],2), round(m[1],2), round(dj/S['tw'],2)))
        for k in range(nn):
            if brk >= 0 and (k == brk or (k-1) % nn == brk or (k == 0 and brk == nn-1)): continue
            p0, p1, p2 = P(ch[(k-1) % nn]), P(ch[k]), P(ch[(k+1) % nn])
            v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1]); n1, n2 = math.hypot(*v1), math.hypot(*v2)
            if n1 < 1e-9 or n2 < 1e-9: continue
            cosv = (v1[0]*v2[0]+v1[1]*v2[1])/(n1*n2)
            if cosv < 0.5:
                dj = min(math.dist(p1, j) for j in J)
                sharp.append((round(math.degrees(math.acos(max(-1,min(1,cosv)))),0), c, k, round(p1[0],2), round(p1[1],2), round(dj/S['tw'],2)))
    top.sort(reverse=True)
    print(d, n, 'top stretch', [t for t in top[:4]])
    print(d, n, 'sharp near joint (<1w)', sum(1 for s in sharp if s[5] < 1.0), 'far', [s for s in sharp if s[5] >= 1.0][:8])
for n in ['D_7', 'L', 'D_9']:
    for d in ['hbase', 'h1.8']: look(d, n)
