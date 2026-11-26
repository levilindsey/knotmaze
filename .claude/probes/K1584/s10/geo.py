# K1584 s10: overlay chain centrelines (solid) and edges at +-halfWidth (dotted) on a capture crop, chain ids labelled,
# crossings in the crop listed (over chain first).  python geo.py <out.png> <capDir> <x> <y> <half> <scale>
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
out, d, x, y, H, S = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
J = json.load(open(os.path.join(d, 'scene_gf.json'))); cam = J['camera']; A = cam['worldToCss']; dpr = cam['dpr']
h = J['look']['halfWidth']; ppu = A[0] * dpr
x0, y0 = int(round(x)) - H, int(round(y)) - H
im = Image.open(os.path.join(d, 'gf_b2.png')).convert('L').crop((x0, y0, x0 + 2 * H, y0 + 2 * H))
g = np.asarray(im).astype(np.float32); g = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(g).resize((2 * H * S, 2 * H * S), Image.NEAREST).convert('RGB'); D = ImageDraw.Draw(im)
dev = lambda wx, wy: ((A[0] * wx + A[2] * wy + A[4]) * dpr, (A[1] * wx + A[3] * wy + A[5]) * dpr)
cols = [(255, 0, 0), (0, 160, 255), (0, 200, 0), (255, 140, 0), (200, 0, 255), (0, 220, 220)]
ci = 0
for c in J['chains']:
    P = np.array(c['pts'], dtype=float).reshape(-1, 2); z = np.array(c.get('z', [0] * len(P)))
    Q = np.array([dev(px, py) for px, py in P])
    inside = (Q[:, 0] > x0 - 20) & (Q[:, 0] < x0 + 2 * H + 20) & (Q[:, 1] > y0 - 20) & (Q[:, 1] < y0 + 2 * H + 20)
    if not inside.any(): continue
    col = cols[ci % len(cols)]; ci += 1
    T = np.gradient(Q, axis=0); T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-9); N = np.stack([-T[:, 1], T[:, 0]], 1)
    L = lambda R: [((u - x0) * S, (v - y0) * S) for u, v in R]
    idx = np.where(inside)[0]
    for seg in np.split(idx, np.where(np.diff(idx) != 1)[0] + 1):
        if len(seg) < 2: continue
        D.line(L(Q[seg]), fill=col, width=2)
        for sg in (1, -1):
            E = Q[seg] + sg * N[seg] * h * ppu
            pts = L(E)
            for i in range(0, len(pts) - 1, 2): D.line(pts[i:i + 2], fill=col, width=1)
        m = seg[len(seg) // 2]; u, v = L([Q[m]])[0]
        D.text((u + 4, v + 4), 'c%s z%+.2f' % (c['id'], z[m]), fill=col)
print('chains drawn', ci)
for i, X in enumerate(J['crossings']):
    a, b = X['a'], X['b']
    print(i, X) if False else None
im.save(out); print(out, im.size)
