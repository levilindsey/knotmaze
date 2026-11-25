# K1588 s2: zoom tiles of three captures at given places: stage 4 | stage 1 | stage 2 | changed (red: stage 2
# differs from stage 1; yellow box: stage 2 differs from stage 4), levels 16..40 stretched (dark fills), NEAREST.
#   python z3cap.py <s4Root> <j3Root> <j4Root> <out.png> <maze:x:y:label> ... [--half 12] [--sc 10]
# A place's x, y are device px (an fdiff box's x, y are its CENTRE).
import sys, os
from PIL import Image, ImageDraw
a = sys.argv[1:]; HALF, SC = 12, 10
if '--half' in a: i = a.index('--half'); HALF = int(a[i + 1]); del a[i:i + 2]
if '--sc' in a: i = a.index('--sc'); SC = int(a[i + 1]); del a[i:i + 2]
roots, outp, places = a[0:3], a[3], a[4:]
N = 2 * HALF + 1; T = N * SC; G = 6
lev = lambda v: max(0, min(255, int((v - 16) * 255 / 24)))
sh = Image.new('RGB', (4 * (T + G), len(places) * (T + 18)), (90, 90, 90)); d = ImageDraw.Draw(sh)
for r, p in enumerate(places):
    mz, x, y, lab = p.split(':', 3); x, y = int(x), int(y)
    ims = [Image.open(os.path.join(rt, mz, 'gf_b2.png')).convert('L').crop((x - HALF, y - HALF, x + HALF + 1, y + HALF + 1)) for rt in roots]
    px = [im.load() for im in ims]; y0 = r * (T + 18) + 16
    d.text((3, y0 - 14), f'{mz} {lab} ({x},{y})  stage 4 | stage 1 | stage 2 | changed (red s2 vs s1, yellow box s2 vs s4)', fill=(255, 255, 0))
    for k, im in enumerate(ims):
        t = im.point(lev).convert('RGB').resize((T, T), Image.NEAREST); sh.paste(t, (k * (T + G), y0))
    D = Image.new('RGB', (T, T), (40, 40, 40)); dd = ImageDraw.Draw(D)
    for j in range(N):
        for i in range(N):
            if abs(px[2][i, j] - px[1][i, j]) > 2: dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), fill=(230, 40, 40))
            if abs(px[2][i, j] - px[0][i, j]) > 2: dd.rectangle((i * SC, j * SC, i * SC + SC - 1, j * SC + SC - 1), outline=(240, 220, 0))
    sh.paste(D, (3 * (T + G), y0))
sh.save(outp)
