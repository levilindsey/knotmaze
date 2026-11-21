# t81s, the width question: where the under thread's two borders come out below the over thread, measured along
# the over thread's lower edge, and a labelled picture of it.
#   python t81s_answer.py <gf.png> <gf_fill.png> <scene_gf.json> <out prefix>
# Under thread = chain 45, over thread = chain 9, branch = chain 81 (junction j103).
import sys
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

gf, fillp, sj, out = sys.argv[1:5]
U, O, B = 45, 9, 81
S = json.load(open(sj, encoding='utf-8'))
a, _, _, d, e, f = S['camera']['worldToCss']
dpr = S['camera']['dpr']
hw = S['look']['halfWidth'] * a * dpr
band = S['look']['band'] * a * dpr


def poly(cid):
    ch = next(c for c in S['chains'] if c['id'] == cid)
    p = np.array(ch['pts'], dtype=float).reshape(-1, 2)
    P = np.stack([(p[:, 0] * a + e) * dpr, (p[:, 1] * d + f) * dpr], axis=1)
    T = np.gradient(P, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-9)
    return P, T, np.stack([-T[:, 1], T[:, 0]], axis=1)


im = np.asarray(Image.open(gf).convert('RGB')).astype(float)
lum = im[:, :, 0] * 0.299 + im[:, :, 1] * 0.587 + im[:, :, 2] * 0.114
fi = np.asarray(Image.open(fillp).convert('RGB')).astype(float)
flum = fi.sum(axis=2)
fthr = (np.percentile(flum[1076:1196, 870:990], 2) + np.percentile(flum[1076:1196, 870:990], 60)) / 2


def samp(L, x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y))
    fx, fy = x - x0, y - y0
    return (L[y0, x0] * (1 - fx) * (1 - fy) + L[y0, x0 + 1] * fx * (1 - fy)
            + L[y0 + 1, x0] * (1 - fx) * fy + L[y0 + 1, x0 + 1] * fx * fy)


CX, CY = 930, 1136
PU, TU, NU = poly(U)
PO, TO, NO = poly(O)
PB, TB, NB = poly(B)
near = [i for i in range(len(PO)) if abs(PO[i, 0] - CX) < 90 and abs(PO[i, 1] - CY) < 90]
sg = 1 if NO[near[len(near) // 2], 1] > 0 else -1          # the normal sign that points DOWN the screen
box = lum[CY - 60:CY + 60, CX - 60:CX + 60]
ink, bg = np.percentile(box, 2), np.percentile(box, 60)
thr = (ink + bg) / 2
print('half width %.1f px, band %.1f px, ink %.1f, ground %.1f, threshold %.1f' % (hw, band, ink, bg, thr))

# stations along the over thread's lower edge, densified to about 1 px
E = PO[near] + sg * hw * NO[near]
EN = sg * NO[near]
if E[0, 0] > E[-1, 0]:
    E, EN = E[::-1], EN[::-1]
seg = np.linalg.norm(np.diff(E, axis=0), axis=1)
arc = np.concatenate([[0], np.cumsum(seg)])
ss = np.arange(0, arc[-1], 1.0)
pts = np.stack([np.interp(ss, arc, E[:, 0]), np.interp(ss, arc, E[:, 1])], axis=1)
nrm = np.stack([np.interp(ss, arc, EN[:, 0]), np.interp(ss, arc, EN[:, 1])], axis=1)
nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
keep = (pts[:, 0] > 892) & (pts[:, 0] < 968)
pts, nrm = pts[keep], nrm[keep]
print('along the over thread\'s lower edge, x %.0f..%.0f; # = ink, . = none; rows = px BELOW that edge' % (pts[0, 0], pts[-1, 0]))
rows = {}
for off in (-3, 2, 4, 6, 8, 11):
    v = np.array([samp(lum, p[0] + off * n[0], p[1] + off * n[1]) for p, n in zip(pts, nrm)])
    rows[off] = v < thr
    print('  %+3d  %s' % (off, ''.join('#' if x else '.' for x in rows[off])))
print('       ' + ''.join(str(int(p[0]) // 10 % 10) if int(p[0]) % 10 == 0 else ' ' for p in pts) + '   (tens digit of x)')
fv = np.array([samp(flum, p[0] + 4 * n[0], p[1] + 4 * n[1]) for p, n in zip(pts, nrm)])
print('  fill look 4 px below the edge (# = thread body, . = ground): ' + ''.join('#' if x > fthr else '.' for x in fv))


def runs(mask):
    r, s0 = [], None
    for k, m in enumerate(mask):
        if m and s0 is None:
            s0 = k
        if not m and s0 is not None:
            r.append((s0, k - 1))
            s0 = None
    if s0 is not None:
        r.append((s0, len(mask) - 1))
    return r


for off in (4, 6):
    print('  open (no ink) %d px below the edge: ' % off + ', '.join(
        'x %.0f..%.0f (%.0f px along the edge)' % (pts[s][0], pts[t][0], t - s + 1) for s, t in runs(~rows[off])))
print('  thread body 4 px below the edge: ' + ', '.join(
    'x %.0f..%.0f (%.0f px)' % (pts[s][0], pts[t][0], t - s + 1) for s, t in runs(fv > fthr)))


# where the under thread's two true edges meet the over thread's lower edge
def meet(side):
    Q = PU + side * hw * NU
    best = None
    for i in range(len(Q)):
        if abs(Q[i, 0] - CX) > 60 or abs(Q[i, 1] - CY) > 60:
            continue
        dd = np.linalg.norm(pts - Q[i], axis=1)
        k = int(dd.argmin())
        if best is None or dd[k] < best[0]:
            best = (dd[k], k)
    return best[1]


k1, k2 = sorted((meet(-1), meet(1)))
print('the under thread\'s true edges meet that edge at x %.1f and x %.1f: %d px apart along it' % (pts[k1, 0], pts[k2, 0], k2 - k1))
ju = next(j for j in S['junctions'] if j['id'] == 'j103')
jc = np.array([(ju['c'][0] * a + e) * dpr, (ju['c'][1] * d + f) * dpr])
print('junction j103 at (%.1f, %.1f)' % (jc[0], jc[1]))

# ---------------------------------------------------------------- the picture
R, K = 64, 8
font = ImageFont.truetype('arial.ttf', 17)
small = ImageFont.truetype('arial.ttf', 14)


def cut(arr, k):
    c = arr[CY - R:CY + R + 1, CX - R:CX + R + 1]
    lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
    c = np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255)
    return Image.fromarray(c.astype(np.uint8)).resize((c.shape[1] * k, c.shape[0] * k), Image.NEAREST)


def to(p, k=K):
    return ((p[0] - (CX - R)) * k + k / 2, (p[1] - (CY - R)) * k + k / 2)


def label(dr, xy, text, col=(255, 255, 255), fnt=font):
    x, y = xy
    for dx in (-2, -1, 0, 1, 2):
        for dy in (-2, -1, 0, 1, 2):
            dr.text((x + dx, y + dy), text, fill=(0, 0, 0), font=fnt)
    dr.text((x, y), text, fill=col, font=fnt)


def dashed(dr, Q, col, width=2, on=3, off=2):
    n = 0
    for i in range(len(Q) - 1):
        if abs(Q[i, 0] - CX) > R + 5 or abs(Q[i, 1] - CY) > R + 5:
            continue
        if n % (on + off) < on:
            dr.line([to(Q[i]), to(Q[i + 1])], fill=col, width=width)
        n += 1


t = cut(im, K)
dr = ImageDraw.Draw(t)
CY_ = (70, 235, 255)
for side in (-1, 1):
    dashed(dr, PU + side * hw * NU, CY_)
for k, nm in ((k1, 'true left edge'), (k2, 'true right edge')):
    q = to(pts[k])
    dr.ellipse([q[0] - 7, q[1] - 7, q[0] + 7, q[1] + 7], outline=(255, 255, 255), width=2)
qa, qb = to(pts[k1] - 17 * nrm[k1]), to(pts[k2] - 17 * nrm[k2])
dr.line([qa, qb], fill=(255, 255, 255), width=2)
label(dr, (qa[0] + 36, qa[1] - 6), 'its edges come out at the two circles: %d px apart' % (k2 - k1))
op = runs(~rows[4])
op = [r for r in op if pts[r[0], 0] > pts[k1, 0] - 12 and pts[r[1], 0] < pts[k2, 0] + 12]
if op:
    s, tt = max(op, key=lambda r: r[1] - r[0])
    qa, qb = to(pts[s] + 4 * nrm[s]), to(pts[tt] + 4 * nrm[tt])
    dr.line([qa, qb], fill=(255, 230, 60), width=3)
    label(dr, (qa[0] - 30, qa[1] + 52), 'the open gap you can see: 20 to %d px' % (tt - s + 1), (255, 230, 60))
    dr.line([(qa[0] + 60, qa[1] + 52), ((qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2 + 3)], fill=(255, 230, 60), width=1)
label(dr, (14, 150), 'OVER thread', (150, 255, 150))
label(dr, (to(PU[0])[0] if False else 470, 16), 'UNDER thread, upper side', CY_)
label(dr, (20, 820), 'UNDER thread goes on to the left', CY_)
label(dr, (600, 900), 'branch (t81s) leaves to the right', (255, 190, 70))
label(dr, (196, 520), 'the step', (255, 255, 255))
jq = to(jc)
dr.ellipse([jq[0] - 5, jq[1] - 5, jq[0] + 5, jq[1] + 5], fill=(255, 190, 70))
label(dr, (jq[0] + 12, jq[1] + 4), 'junction', (255, 190, 70), small)
label(dr, (14, t.height - 30), 'dashed = the under thread\'s edges if nothing covered or joined it', CY_, small)
t.save(out + '_labels.png')

k2x = 4
A, Bp = cut(im, k2x), cut(fi, k2x)
pad = 10
sheet = Image.new('RGB', (A.width * 2 + pad * 3, A.height + pad * 2 + 26), (16, 16, 24))
sheet.paste(A, (pad, pad + 26))
sheet.paste(Bp, (pad * 2 + A.width, pad + 26))
ds = ImageDraw.Draw(sheet)
ds.text((pad, 8), 'as drawn (outlines), brightened', fill=(230, 230, 240), font=small)
ds.text((pad * 2 + A.width, 8), 'the same place, threads painted solid', fill=(230, 230, 240), font=small)
sheet.save(out + '_drawn.png')
print('wrote', out + '_labels.png', t.size, out + '_drawn.png', sheet.size)
