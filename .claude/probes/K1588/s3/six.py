# K1588 s3: one sheet per named crossing of a maze: master | this build | source branch | changed (red: this build
# differs from master; yellow box: this build differs from the source branch), levels 16..40 stretched (dark
# fills), NEAREST. A crossing is placed as fdiff.py places it (its under pass's point, scene_gf.json of the first root).
#   python six.py <masterRoot> <thisRoot> <srcRoot> <maze> <outDir> <x195> <x338> ... [--half 40] [--sc 5] [--dx n --dy n]
import sys, os, json, math
from PIL import Image, ImageDraw
a = sys.argv[1:]; HALF, SC, DX, DY, SUF = 40, 5, 0, 0, ''
if '--half' in a: i = a.index('--half'); HALF = int(a[i + 1]); del a[i:i + 2]
if '--sc' in a: i = a.index('--sc'); SC = int(a[i + 1]); del a[i:i + 2]
if '--dx' in a: i = a.index('--dx'); DX = int(a[i + 1]); del a[i:i + 2]
if '--dy' in a: i = a.index('--dy'); DY = int(a[i + 1]); del a[i:i + 2]
if '--suf' in a: i = a.index('--suf'); SUF = a[i + 1]; del a[i:i + 2]
roots, mz, outd, names = a[0:3], a[3], a[4], a[5:]
os.makedirs(outd, exist_ok=True)
b = os.path.join(roots[0], mz)
scene = json.load(open(os.path.join(b, 'scene_gf.json'))); T = json.load(open(os.path.join(b, 'sites_gf.json')))['toDevA']
def at(c, s):
    pts = scene['chains'][c]['pts']; m = len(pts) // 2; closed = scene['chains'][c]['closed']
    acc = 0; segs = m if closed else m - 1
    for i in range(segs):
        j = (i + 1) % m
        dx = pts[2 * j] - pts[2 * i]; dy = pts[2 * j + 1] - pts[2 * i + 1]; l = math.hypot(dx, dy)
        if acc + l >= s or i == segs - 1:
            t = (s - acc) / l if l > 0 else 0
            return pts[2 * i] + dx * t, pts[2 * i + 1] + dy * t
        acc += l
lev = lambda v: max(0, min(255, int((v - 16) * 255 / 24)))
N = 2 * HALF + 1; TS = N * SC; G = 6
for nm in names:
    k = int(nm.lstrip('x')); c = scene['crossings'][k]
    u = c['b'] if c['over'] == 'a' else c['a']; o = c['a'] if c['over'] == 'a' else c['b']
    wx, wy = at(u['chain'], u['s']); x = int(round(T[0] * wx + T[2] * wy + T[4])) + DX; y = int(round(T[1] * wx + T[3] * wy + T[5])) + DY
    ims = [Image.open(os.path.join(rt, mz, 'gf_b2.png')).convert('L').crop((x - HALF, y - HALF, x + HALF + 1, y + HALF + 1)) for rt in roots]
    px = [im.load() for im in ims]
    sh = Image.new('RGB', (4 * (TS + G), TS + 36), (90, 90, 90)); d = ImageDraw.Draw(sh)
    d.text((3, 2), f"{mz} {nm} at ({x},{y}): under chain {u['chain']}, over chain {o['chain']}", fill=(255, 255, 0))
    for kk, lab in enumerate(['master (m0)', 'this build (j5)', 'source branch (j4)', 'changed: red j5 vs master, yellow j5 vs j4']):
        d.text((kk * (TS + G) + 3, 18), lab, fill=(255, 255, 255))
    for kk, im in enumerate(ims):
        sh.paste(im.point(lev).convert('RGB').resize((TS, TS), Image.NEAREST), (kk * (TS + G), 34))
    D = Image.new('RGB', (TS, TS), (40, 40, 40)); dd = ImageDraw.Draw(D); nr = ny = 0
    for j in range(N):
        for i in range(N):
            if abs(px[1][i, j] - px[0][i, j]) > 2: nr += 1; dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), fill=(230, 40, 40))
            if abs(px[1][i, j] - px[2][i, j]) > 2: ny += 1; dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), outline=(240, 220, 0))
    sh.paste(D, (3 * (TS + G), 34))
    p = os.path.join(outd, f'{mz}_{nm}{SUF}.png'); sh.save(p)
    print(f'{nm} ({x},{y}) under {u["chain"]} over {o["chain"]}: j5 vs master {nr} px, j5 vs j4 {ny} px -> {p}')
