# K1470's fill-look nub at j71 of g41_user_tw64, for Levi: the place painted solid (the nub marked) beside its
# outlines, wide and close.   python nub_pic.py <cap scene dir> <out.png> [older cap scene dir, to count changes]
import sys
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

d, out = sys.argv[1:3]
old = sys.argv[3] if len(sys.argv) > 3 else None
M = json.load(open(d + '/meta.json', encoding='utf-8'))
v, dpr = M['view'], M['dpr']
font = ImageFont.truetype('arial.ttf', 17)
big = ImageFont.truetype('arialbd.ttf', 19)
tag = ImageFont.truetype('arialbd.ttf', 34)
YEL = (255, 230, 60)
NUB = (4.66, 7.46)


def dev(wx, wy):
    return ((wx * v['s'] + v['x']) * dpr, (wy * v['s'] + v['y']) * dpr)


def label(dr, xy, text, col=(255, 255, 255), fnt=font, halo=2):
    x, y = xy
    for dx in range(-halo, halo + 1):
        for dy in range(-halo, halo + 1):
            dr.text((x + dx, y + dy), text, fill=(0, 0, 0), font=fnt)
    dr.text((x, y), text, fill=col, font=fnt)


IM = {nm: np.asarray(Image.open(d + '/' + nm + '.png').convert('RGB')).astype(float) for nm in ('fill', 'border')}
print('hash', M.get('hash'), 'view', v, 'dpr', dpr, 'size', IM['fill'].shape[:2])
SPOTS = [('the nub', NUB), ('thread B body', (4.97, 7.27)), ('ground left of B', (4.36, 7.50)),
         ('thread C body', (4.75, 7.82)), ('over thread A body', (4.42, 6.90))]
for nm, (wx, wy) in SPOTS:
    x, y = (int(round(q)) for q in dev(wx, wy))
    print('%-20s world (%.2f, %.2f) device (%d, %d): solid %s  outlines %s' % (
        nm, wx, wy, x, y, IM['fill'][y - 1:y + 2, x - 1:x + 2].mean(axis=(0, 1)).round(0),
        IM['border'][y - 1:y + 2, x - 1:x + 2].mean(axis=(0, 1)).round(0)))
if old:
    MO = json.load(open(old + '/meta.json', encoding='utf-8'))
    print('older capture: hash', MO.get('hash'), 'view equal', MO['view'] == v)
    x, y = (int(round(q)) for q in dev(*NUB))
    for nm in ('fill', 'border'):
        o = np.asarray(Image.open(old + '/' + nm + '.png').convert('RGB')).astype(float)
        for R in (45, 120):
            df = np.abs(o[y - R:y + R + 1, x - R:x + R + 1] - IM[nm][y - R:y + R + 1, x - R:x + R + 1]).max(axis=2)
            print('  %s, +-%d px around the nub: %d px differ (%d by more than 8 levels), largest %d' % (
                nm, R, int((df > 0).sum()), int((df > 8).sum()), int(df.max())))

ROWS = [((4.75, 7.40), 110, 4), ((4.66, 7.45), 40, 11)]
# one stretch for every panel, only when the capture is dark
(wx0, wy0), R0, _ = ROWS[0]
x0, y0 = (int(round(q)) for q in dev(wx0, wy0))
hi = max(np.percentile(IM[nm][y0 - R0:y0 + R0 + 1, x0 - R0:x0 + R0 + 1], 99.8) for nm in IM)
stretch = hi < 170
print('levels: 99.8th percentile %.0f -> %s' % (hi, 'brightened' if stretch else 'as drawn'))


def panel(nm, c, R, K):
    cx, cy = (int(round(q)) for q in dev(*c))
    a = IM[nm][cy - R:cy + R + 1, cx - R:cx + R + 1]
    if stretch:
        a = np.clip(a / max(hi, 1) * 255, 0, 255)
    t = Image.fromarray(a.astype(np.uint8)).resize((a.shape[1] * K, a.shape[0] * K), Image.NEAREST)

    def to(wx, wy):
        x, y = dev(wx, wy)
        return ((x - (cx - R)) * K + K / 2, (y - (cy - R)) * K + K / 2)
    return t, to


def arrow(dr, p, q, col=YEL, width=4, head=18):
    dr.line([p, q], fill=col, width=width)
    u = np.array([q[0] - p[0], q[1] - p[1]], dtype=float)
    u /= max(np.linalg.norm(u), 1e-6)
    n = np.array([-u[1], u[0]])
    b = np.array(q) - u * head
    dr.polygon([tuple(q), tuple(b + n * head * 0.5), tuple(b - n * head * 0.5)], fill=col)


TAGS = {0: [('A', (4.40, 6.84)), ('B', (4.93, 7.20)), ('C', (4.72, 7.76))],
        1: [('A', (4.30, 7.07)), ('B', (4.93, 7.27)), ('C', (4.50, 7.74))]}
pad, head, foot = 12, 34, 64
W = max((2 * R + 1) * K for _, R, K in ROWS)
H = sum((2 * R + 1) * K + pad for _, R, K in ROWS)
sheet = Image.new('RGB', (2 * W + 3 * pad, head + H + foot), (16, 16, 24))
ds = ImageDraw.Draw(sheet)
note = ', brightened' if stretch else ''
ds.text((pad, 8), 'threads painted solid%s' % note, fill=(230, 230, 240), font=big)
ds.text((2 * pad + W, 8), 'outlines%s (the look you said is right)' % note, fill=(230, 230, 240), font=big)
y = head
for r, (c, R, K) in enumerate(ROWS):
    for n, nm in enumerate(('fill', 'border')):
        t, to = panel(nm, c, R, K)
        dr = ImageDraw.Draw(t)
        for ch, w in TAGS[r]:
            q = to(*w)
            label(dr, (q[0] - 11, q[1] - 19), ch, (255, 255, 255), tag, 3)
        if r == 0:
            (cw, R1, _) = ROWS[1]
            q = to(*cw)
            h = R1 * K
            dr.rectangle([q[0] - h, q[1] - h, q[0] + h, q[1] + h], outline=YEL, width=2)
        elif nm == 'fill':
            arrow(dr, to(4.97, 7.13), to(4.71, 7.44))
            label(dr, (to(4.97, 7.13)[0] - 250, to(4.97, 7.13)[1] - 54), 'the nub: no paint here,', YEL, big)
            label(dr, (to(4.97, 7.13)[0] - 250, to(4.97, 7.13)[1] - 30), 'though it is inside thread B', YEL, big)
        sheet.paste(t, (pad + n * (W + pad), y))
    y += (2 * R + 1) * K + pad
ds.text((pad, y + 4), 'A = the over thread.   B = comes out from under A and, less than a thread\'s width on, ends on C.   '
        'C = the thread B joins; it runs on through.', fill=(230, 230, 240), font=font)
ds.text((pad, y + 30), 'Top row: the place with its surroundings (yellow box = the close-up below).', fill=(170, 170, 185), font=font)
sheet.save(out)
print('wrote', out, sheet.size)
