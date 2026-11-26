# K1584 s6: the fade sheet: chosen balls (tight/<m>.json) across captures at several fade lengths, tone-mapped as
# region.py, one ball a row, a ring (the ball's disk) drawn on the first column only.
#   python fsheet.py <out.png> <label=capTemplate,...> <m:k,...> [--half 24] [--scale 5]
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; cols = [c.split('=', 1) for c in sys.argv[2].split(',')]; balls = [b.split(':') for b in sys.argv[3].split(',')]
HF = int(sys.argv[sys.argv.index('--half') + 1]) if '--half' in sys.argv else 24
SC = int(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 5
here = os.path.dirname(os.path.abspath(__file__)); S = 2 * HF * SC
try: fnt = ImageFont.truetype('arialbd.ttf', 14)
except Exception: fnt = ImageFont.load_default()
sh = Image.new('RGB', (110 + len(cols) * (S + 4), 22 + len(balls) * (S + 4)), (30, 30, 30)); D = ImageDraw.Draw(sh)
for c, (lab, _) in enumerate(cols): D.text((110 + c * (S + 4) + 4, 3), lab, fill=(255, 255, 0), font=fnt)
for r, (m, k) in enumerate(balls):
    J = json.load(open(os.path.join(here, 'tight', m + '.json'))); s = abs(J['A'][0])
    b = [t for t in J['tight'] if t['k'] == int(k)][0]; cx, cy = b['dev']; R = (b['r'] + J['W']) * s
    x, y = int(round(cx)), int(round(cy)); Y = 22 + r * (S + 4)
    D.text((4, Y + 4), '%s k%s\nj%d c%d/c%d\n%d,%d\nR %.1f px' % (m, k, b['j'], b['ca'], b['cb'], x, y, R), fill=(255, 255, 255), font=fnt)
    for c, (_, t) in enumerate(cols):
        g = np.asarray(Image.open(t.replace('{m}', m) + r'\gf_b2.png').convert('L')).astype(np.float32)[y - HF:y + HF, x - HF:x + HF]
        im = Image.fromarray(np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)).resize((S, S), Image.NEAREST).convert('RGB')
        dd = ImageDraw.Draw(im); c0 = (cx - (x - HF)) * SC; c1 = (cy - (y - HF)) * SC
        if c == 0: dd.ellipse((c0 - R * SC, c1 - R * SC, c0 + R * SC, c1 + R * SC), outline=(255, 60, 60))
        dd.point((c0, c1), fill=(255, 60, 60))
        sh.paste(im, (110 + c * (S + 4), Y))
sh.save(out); print(out, sh.size)
