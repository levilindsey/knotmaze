"""K1626 s4: draw the particles around a joint eye from census.ts states (PIL).

  python s4_plot.py <out.png> <eye> <dir> [<dir> ...]     (eye = J132xX254)

Env MAZE (default L), R (world half-size, default 1.6), PX (panel px, 700).
Each dir is one panel: every chain's polyline and particles within the box,
the eye's two arms thick and coloured with slot numbers, the joint (red
disc) and the crossing (blue ring), and a circle of one thread width.
"""
import json, os, sys
from PIL import Image, ImageDraw

out, eye, dirs = sys.argv[1], sys.argv[2], sys.argv[3:]
MAZE = os.environ.get('MAZE', 'L')
R = float(os.environ.get('R', 1.6))
PX = int(os.environ.get('PX', 700))
jid = int(eye[1:eye.index('x')]); xid = int(eye[eye.index('X') + 1:])
img = Image.new('RGB', (PX * len(dirs), PX + 20), 'white')
dr = ImageDraw.Draw(img)
COL = [(220, 60, 60), (40, 110, 220), (30, 160, 70), (200, 120, 0)]
S0 = json.load(open(f'{dirs[0]}/{MAZE}.json'))
J0 = S0['juncs'][jid]; X0 = S0['xs'][xid]
cx, cy = (J0['x'] + X0['x']) / 2, (J0['y'] + X0['y']) / 2
for pi, d in enumerate(dirs):
    S = json.load(open(f'{d}/{MAZE}.json'))
    pos = S['positions']; chains = S['chains']; tw = S['tw']; brk = S['brk']
    J = S['juncs'][jid]; X = S['xs'][xid]
    arms = [X['over']['chain'], X['under']['chain']]
    ox = pi * PX
    T = lambda x, y: (ox + (x - cx + R) / (2 * R) * PX, 20 + (y - cy + R) / (2 * R) * PX)
    for c, ch in enumerate(chains):
        n = len(ch)
        isarm = c in arms
        col = COL[arms.index(c)] if isarm else (170, 170, 170)
        for k in range(n):
            if brk[c] >= 0 and k == brk[c]:
                continue
            a, b = ch[k], ch[(k + 1) % n]
            pa, pb = T(pos[2*a], pos[2*a+1]), T(pos[2*b], pos[2*b+1])
            if -50 < pa[0] - ox < PX + 50 and -50 < pa[1] < PX + 50:
                dr.line([pa, pb], fill=col, width=4 if isarm else 2)
        for k, p in enumerate(ch):
            q = T(pos[2*p], pos[2*p+1])
            if 0 <= q[0] - ox < PX and 20 <= q[1] < PX + 20:
                dr.ellipse([q[0]-3, q[1]-3, q[0]+3, q[1]+3], fill=(0, 0, 0))
                if isarm:
                    dr.text((q[0] + 4, q[1] - 12), str(k), fill=col)
    j = T(J['x'], J['y']); x = T(X['x'], X['y'])
    dr.ellipse([j[0]-7, j[1]-7, j[0]+7, j[1]+7], outline=(255, 0, 0), width=3)
    dr.ellipse([x[0]-7, x[1]-7, x[0]+7, x[1]+7], outline=(0, 0, 255), width=3)
    rr = tw / 2 / (2 * R) * PX
    dr.ellipse([ox + 20, PX - 20 - 2*rr, ox + 20 + 2*rr, PX - 20], outline=(0, 0, 0))
    dr.text((ox + 6, 4), f'{os.path.basename(d)} {MAZE} {eye} tw={tw}', fill=(0, 0, 0))
    dr.line([(ox + PX - 1, 0), (ox + PX - 1, PX + 20)], fill=(0, 0, 0))
img.save(out)
