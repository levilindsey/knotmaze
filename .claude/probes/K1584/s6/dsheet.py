# K1584 s6: where stage 6 differs from stage 5 at chosen balls: stage 5 | stage 6 | stage 6 with the changed pixels
# (|dLum| > 6) in red, the wedge's reach (bs = 1 at |p - K0| = r + W) as a cyan ring.
#   python dsheet.py <out.png> <capA tmpl> <capB tmpl> <m:k,...> [--half 14] [--scale 10]
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, ta, tb = sys.argv[1:4]; balls = [b.split(':') for b in sys.argv[4].split(',')]
HF = int(sys.argv[sys.argv.index('--half') + 1]) if '--half' in sys.argv else 14
SC = int(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 10
here = os.path.dirname(os.path.abspath(__file__)); S = 2 * HF * SC
try: fnt = ImageFont.truetype('arialbd.ttf', 14)
except Exception: fnt = ImageFont.load_default()
def lum(p):
    x = np.asarray(Image.open(p + r'\gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
sh = Image.new('RGB', (110 + 3 * (S + 4), 22 + len(balls) * (S + 4)), (30, 30, 30)); D = ImageDraw.Draw(sh)
for c, lab in enumerate(['stage 5', 'stage 6', 'changed (red), reach (cyan)']): D.text((110 + c * (S + 4) + 4, 3), lab, fill=(255, 255, 0), font=fnt)
for r, (m, k) in enumerate(balls):
    J = json.load(open(os.path.join(here, 'tight', m + '.json'))); s = abs(J['A'][0])
    b = [t for t in J['tight'] if t['k'] == int(k)][0]; cx, cy = b['dev']; reach = (b['r'] + J['W']) * s
    x, y = int(round(cx)), int(round(cy)); Y = 22 + r * (S + 4)
    A = lum(ta.replace('{m}', m))[y - HF:y + HF, x - HF:x + HF]; B = lum(tb.replace('{m}', m))[y - HF:y + HF, x - HF:x + HF]
    ch = np.abs(B - A) > 6
    D.text((4, Y + 4), '%s k%s\nchanged %d\nreach %.1f px' % (m, k, int(ch.sum()), reach), fill=(255, 255, 255), font=fnt)
    for c in range(3):
        g = A if c == 0 else B
        t = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8); rgb = np.stack([t, t, t], -1)
        if c == 2: rgb[ch] = (255, 40, 40)
        im = Image.fromarray(rgb).resize((S, S), Image.NEAREST); dd = ImageDraw.Draw(im)
        c0 = (cx - (x - HF)) * SC; c1 = (cy - (y - HF)) * SC
        if c == 2: dd.ellipse((c0 - reach * SC, c1 - reach * SC, c0 + reach * SC, c1 + reach * SC), outline=(60, 220, 255))
        dd.point((c0, c1), fill=(255, 60, 60))
        sh.paste(im, (110 + c * (S + 4), Y))
sh.save(out); print(out, sh.size)
