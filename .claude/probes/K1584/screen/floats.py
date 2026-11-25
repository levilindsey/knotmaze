# K1584: free border pieces. Labels a capture's border ink into connected pieces (8-connected, run based) and
# counts the small ones: a piece cut loose at both ends (a floating stroke) or a leftover speck.
#   python floats.py <out.json> <capT template> <capA> <capB> <capC>     (templates hold {m}; capT = today)
# Per maze and capture: pieces by ink area (px; a border is about 4 px wide, a thread 21 px).
# The json lists every piece of <= 300 px in each capture, with the area of the piece that holds the same pixel in
# the other captures (0 = no ink there), so a piece can be called new, or older than a given stage.
import sys, json, bisect
import numpy as np
from PIL import Image
out = sys.argv[1]; caps = sys.argv[2:]
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
BINS = [(1, 8), (9, 40), (41, 120), (121, 300)]
def label(p):
    m = np.asarray(Image.open(p).convert('L')).astype(np.float32) < 21.75
    H, W = m.shape; parent = []; rs = []; re = []; ry = []
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    prev = []; rows = []
    for y in range(H):
        d = np.diff(np.concatenate(([0], m[y].view(np.int8), [0])))
        st = np.flatnonzero(d == 1).tolist(); en = np.flatnonzero(d == -1).tolist(); cur = []; j = 0
        for s, e in zip(st, en):
            i = len(parent); parent.append(i); rs.append(s); re.append(e); ry.append(y)
            while j < len(prev) and prev[j][1] < s: j += 1
            k = j
            while k < len(prev) and prev[k][0] <= e:
                a = find(prev[k][2]); b = find(i)
                if a != b: parent[b] = a
                k += 1
            cur.append((s, e, i))
        prev = cur; rows.append((st, cur))
    n = len(parent); root = np.array([find(i) for i in range(n)]); rs = np.array(rs); re = np.array(re); ry = np.array(ry)
    area = np.bincount(root, weights=re - rs, minlength=n).astype(int)
    sx = np.bincount(root, weights=(re - rs) * (rs + re - 1) / 2.0, minlength=n); sy = np.bincount(root, weights=(re - rs) * ry, minlength=n)
    x0 = np.full(n, 10 ** 6); x1 = np.full(n, -1); y0 = np.full(n, 10 ** 6); y1 = np.full(n, -1)
    np.minimum.at(x0, root, rs); np.maximum.at(x1, root, re - 1); np.minimum.at(y0, root, ry); np.maximum.at(y1, root, ry)
    return dict(rows=rows, root=root, area=area, sx=sx, sy=sy, x0=x0, x1=x1, y0=y0, y1=y1, rs=rs, ry=ry, W=W, H=H)
def at(L, x, y):
    st, cur = L['rows'][y]; k = bisect.bisect_right(st, x) - 1
    if k < 0 or cur[k][1] <= x: return 0
    return int(L['area'][L['root'][cur[k][2]]])
tot = [[0] * len(BINS) for _ in caps]; res = []
for m in MZ:
    Ls = [label(c.replace('{m}', m) + r'\gf_b2.png') for c in caps]; line = []
    for ci, L in enumerate(Ls):
        ids = np.flatnonzero((L['root'] == np.arange(len(L['root']))) & (L['area'] <= 300)); cnt = [0] * len(BINS)
        for i in ids.tolist():
            a = int(L['area'][i])
            if L['x0'][i] <= 1 or L['y0'][i] <= 1 or L['x1'][i] >= L['W'] - 2 or L['y1'][i] >= L['H'] - 2: continue
            for b, (lo, hi) in enumerate(BINS):
                if lo <= a <= hi: cnt[b] += 1; tot[ci][b] += 1
            px, py = int(L['rs'][i]), int(L['ry'][i])
            res.append(dict(m=m, cap=ci, a=a, x=round(float(L['sx'][i] / a), 1), y=round(float(L['sy'][i] / a), 1), w=int(L['x1'][i] - L['x0'][i] + 1), h=int(L['y1'][i] - L['y0'][i] + 1), other=[at(o, px, py) for o in Ls]))
        line.append('/'.join('%d' % c for c in cnt))
    print(m, '  '.join(line), flush=True)
print('ALL', '  '.join('/'.join('%d' % c for c in t) for t in tot)); print('bins', BINS)
json.dump(res, open(out, 'w'))
