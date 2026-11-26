# K1584 s6: one place with its topology: the capture (tone-mapped) at scale, every chain centreline in the box (a
# colour per chain, labelled), the crossings (over chain first) and the tight corners (centre, tangent points).
#   python topo.py <out.png> <capDir> <maze> <x> <y> <half> <scale>
import sys, json, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, cap, m, X, Y, hf, sc = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7])
SC = json.load(open(cap + r'\scene_gf.json')); A = json.load(open(cap + r'\sites_gf.json'))['toDevA']
TJ = json.load(open(__file__.replace('topo.py', r'tight\%s.json' % m)))
try: fnt = ImageFont.truetype('arialbd.ttf', 13)
except Exception: fnt = ImageFont.load_default()
x0, y0 = int(X - hf), int(Y - hf)
g = np.asarray(Image.open(cap + r'\gf_b2.png').convert('L')).astype(np.float32)[y0:y0 + 2 * hf, x0:x0 + 2 * hf]
t = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(t).resize((2 * hf * sc, 2 * hf * sc), Image.NEAREST).convert('RGB'); D = ImageDraw.Draw(im)
dv = lambda x, y: ((A[0] * x + A[2] * y + A[4] - x0) * sc, (A[1] * x + A[3] * y + A[5] - y0) * sc)
def dec(v):
    return v['v'] if isinstance(v, dict) and '__t' in v else v
for ci, c in enumerate(SC['chains']):
    P = dec(c['pts']); L = [dv(P[2 * k], P[2 * k + 1]) for k in range(len(P) // 2)]
    inb = [p for p in L if -20 <= p[0] <= 2 * hf * sc + 20 and -20 <= p[1] <= 2 * hf * sc + 20]
    if not inb: continue
    col = tuple(int(255 * v) for v in colorsys.hsv_to_rgb((ci * 0.137) % 1, 1, 1))
    D.line(L, fill=col, width=1)
    mid = inb[len(inb) // 2]; D.text((mid[0] + 3, mid[1] + 3), 'c%d' % ci, fill=col, font=fnt)
for b in TJ['tight']:
    px, py = (b['dev'][0] - x0) * sc, (b['dev'][1] - y0) * sc
    if 0 <= px <= 2 * hf * sc and 0 <= py <= 2 * hf * sc:
        R = (b['r'] + TJ['W']) * abs(TJ['A'][0]) * sc
        D.ellipse((px - R, py - R, px + R, py + R), outline=(255, 255, 0)); D.ellipse((px - 2, py - 2, px + 2, py + 2), fill=(255, 255, 0))
        for tp in (b['ta'], b['tb']):
            qx, qy = (tp[0] - x0) * sc, (tp[1] - y0) * sc; D.ellipse((qx - 2, qy - 2, qx + 2, qy + 2), fill=(0, 255, 0))
        D.text((px + 4, py - 14), 'k%d j%d c%d/c%d' % (b['k'], b['j'], b['ca'], b['cb']), fill=(255, 255, 0), font=fnt)
CN = json.load(open(__file__.replace(r's6\topo.py', r's5\cnt\%s_s5d.json' % m)))
for x in CN['crossings']:
    px, py = dv(x['wx'], x['wy'])
    if 0 <= px <= 2 * hf * sc and 0 <= py <= 2 * hf * sc:
        D.ellipse((px - 3, py - 3, px + 3, py + 3), outline=(255, 120, 255))
        D.text((px + 4, py + 2), 'x%d o%d/u%d' % (x['i'], x['over'], x['under']), fill=(255, 120, 255), font=fnt)
im.save(out); print(out, im.size)

