# clusters of pixels that change between two whole-maze mirror dumps; sheets of as built | switched
import json, sys, numpy as np
from PIL import Image, ImageDraw
a_, b_, cj, out = sys.argv[1:5]; PER = int(sys.argv[5]) if len(sys.argv) > 5 else 15
A = json.load(open(a_)); B = json.load(open(b_)); n = A['w']; st = A['step']; x0, y0 = A['x0'], A['y0']
ia = np.array(A['ink']).reshape(n, n); ib = np.array(B['ink']).reshape(n, n)
ca = np.array(A['cov']).reshape(n, n); cb = np.array(B['cov']).reshape(n, n)
D = np.abs(ia - ib) > 0.25
print('px', n * n, 'ink px as built', int((ia > 0.5).sum()), 'changed', int(D.sum()), 'added', int(((ib - ia) > 0.25).sum()), 'removed', int(((ia - ib) > 0.25).sum()))
G = 12; m = n // G; cell = D[:m * G, :m * G].reshape(m, G, m, G).any(axis=(1, 3)); lab = -np.ones((m, m), int); k = 0
for i in range(m):
    for j in range(m):
        if cell[i, j] and lab[i, j] < 0:
            st_ = [(i, j)]; lab[i, j] = k
            while st_:
                y, x = st_.pop()
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < m and 0 <= xx < m and cell[yy, xx] and lab[yy, xx] < 0: lab[yy, xx] = k; st_.append((yy, xx))
            k += 1
CX = json.load(open(cj))['crossings']; cw = np.array([[c['wx'], c['wy']] for c in CX])
ys, xs = np.nonzero(D); L = lab[np.minimum(ys // G, m - 1), np.minimum(xs // G, m - 1)]; rows = []
for q in range(k):
    s = L == q; py, px = ys[s].mean(), xs[s].mean(); wx, wy = x0 + (px + 0.5) * st, y0 + (py + 0.5) * st
    d = np.hypot(cw[:, 0] - wx, cw[:, 1] - wy); j = int(d.argmin())
    add = int(((ib - ia)[ys[s], xs[s]] > 0).sum()); rows.append((int(s.sum()), q, px, py, wx, wy, CX[j]['i'], float(d[j]), add))
rows.sort(reverse=True); print('clusters', k)
json.dump([dict(px=r[0], wx=round(r[4], 3), wy=round(r[5], 3), x=r[6], dx=round(r[7], 2), added=r[8]) for r in rows], open(out + '_list.json', 'w'))
hist = {}
for r in rows:
    b = '>=100' if r[0] >= 100 else '30-99' if r[0] >= 30 else '10-29' if r[0] >= 10 else '<10'; hist[b] = hist.get(b, 0) + 1
print('by size', hist)
def img(ink, cov):
    v = 28 + 62 * cov; v = v * (1 - ink) + 255 * ink; return Image.fromarray(np.clip(v, 0, 255).astype(np.uint8)).convert('RGB')
IA, IB = img(ia, ca), img(ib, cb); K, Z = 64, 4; W = 2 * K * Z + 6
for pg in range(0, len(rows), PER):
    part = rows[pg:pg + PER]; cols = 3; nr = (len(part) + cols - 1) // cols
    S = Image.new('RGB', (cols * (W + 14), nr * (K * Z + 26)), (255, 255, 255)); Dr = ImageDraw.Draw(S)
    for t, r in enumerate(part):
        cx, cy = int(r[2]), int(r[3]); bx = (cx - K // 2, cy - K // 2, cx + K // 2, cy + K // 2)
        ox, oy = (t % cols) * (W + 14), (t // cols) * (K * Z + 26)
        S.paste(IA.crop(bx).resize((K * Z, K * Z), Image.NEAREST), (ox, oy + 20)); S.paste(IB.crop(bx).resize((K * Z, K * Z), Image.NEAREST), (ox + K * Z + 6, oy + 20))
        Dr.text((ox + 3, oy + 4), f'#{pg + t + 1}  x{r[6]} ({r[7]:.2f} away)  {r[0]} px, {r[8]} added   as built | switched', fill=(0, 0, 0))
    S.save(f'{out}_{pg // PER + 1}.png')
print('sheets', (len(rows) + PER - 1) // PER)
