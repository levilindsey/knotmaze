# K1588 s3: close-ups of device points, as six.py draws them: master | this build | source branch | changed (red: this
# build vs master; yellow box: this build vs the source branch), levels 16..40 stretched, NEAREST, HALF px each way.
#   python zoombox.py <masterRoot> <thisRoot> <srcRoot> <maze> <outPng> <label:x,y> ... [--half 14] [--sc 9]
# One row per point, all in one sheet. A point may name its own maze: <maze:label:x,y>.
import sys, os
from PIL import Image, ImageDraw
a = sys.argv[1:]; HALF, SC = 14, 9
if '--half' in a: i = a.index('--half'); HALF = int(a[i + 1]); del a[i:i + 2]
if '--sc' in a: i = a.index('--sc'); SC = int(a[i + 1]); del a[i:i + 2]
roots, mz0, outp, pts = a[0:3], a[3], a[4], a[5:]
cache = {}
def load(m):
    if m not in cache: cache[m] = [Image.open(os.path.join(rt, m, 'gf_b2.png')).convert('L') for rt in roots]
    return cache[m]
lev = lambda v: max(0, min(255, int((v - 16) * 255 / 24)))
N = 2 * HALF + 1; TS = N * SC; G = 6; RH = TS + 18
sh = Image.new('RGB', (4 * (TS + G), RH * len(pts)), (90, 90, 90)); d = ImageDraw.Draw(sh)
for r, p in enumerate(pts):
    q = p.split(':'); mz = q[0] if len(q) == 3 else mz0; lab, xy = q[-2], q[-1]; ims = load(mz)
    x, y = (int(v) for v in xy.split(','))
    cr = [im.crop((x - HALF, y - HALF, x + HALF + 1, y + HALF + 1)) for im in ims]; px = [c.load() for c in cr]
    oy = r * RH
    d.text((3, oy + 2), f"{mz} {lab} at ({x},{y}): master | this build | source branch | red vs master, yellow vs source", fill=(255, 255, 0))
    for k, c in enumerate(cr):
        sh.paste(c.point(lev).convert('RGB').resize((TS, TS), Image.NEAREST), (k * (TS + G), oy + 16))
    D = Image.new('RGB', (TS, TS), (40, 40, 40)); dd = ImageDraw.Draw(D); nr = ny = 0
    for j in range(N):
        for i in range(N):
            if abs(px[1][i, j] - px[0][i, j]) > 2: nr += 1; dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), fill=(230, 40, 40))
            if abs(px[1][i, j] - px[2][i, j]) > 2: ny += 1; dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), outline=(240, 220, 0))
    sh.paste(D, (3 * (TS + G), oy + 16))
    print(f'{mz} {lab} ({x},{y}): vs master {nr} px, vs source {ny} px')
sh.save(outp); print(outp)
