# K1584 land8: four-way pixel check of the merged build, per maze. A = s8a (gap stage 8 on the old base), L = land8
# (stage 8 on master), M = m0 (the old base, today), J = j5 (master's junction rule, K1588 s3). Both src pairs are
# exact: m0's src = s8a's base, j5's src = master's. So L should equal "A with the junction rule's pixels as J draws
# them": P = J where J != M, else A. Where the gap (A != M) and the junction rule (J != M) both change a pixel, P is
# ambiguous: those pixels are "overlap" and reported by which side L took (J, A or neither).
#   python cmp4.py <out.json> <A tmpl> <L tmpl> <M tmpl> <J tmpl> <cnt tmpl> [thr=1]
# Templates hold {m}. A pixel differs when any channel differs by more than thr levels (thr 0 = any). Changed places
# are clusters of 8 px blocks holding any pixel of L != A or L != P (blocks merged across one empty block), each with
# its bbox, counts by class, the max level, and the nearest junction (L's sites_gf.json) and crossing (cnt json).
import sys, json
import numpy as np
from PIL import Image
out, tA, tL, tM, tJ, tC = sys.argv[1:7]
thr = int(sys.argv[7]) if len(sys.argv) > 7 else 1
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
B = 8


def img(t, m, f='gf_b2.png'):
    return np.asarray(Image.open(t.format(m=m) + '\\' + f).convert('RGB')).astype(np.int16)


def dif(a, b):
    return np.abs(a - b).max(axis=2)


def clusters(mask):
    h, w = mask.shape
    bh, bw = (h + B - 1) // B, (w + B - 1) // B
    pad = np.zeros((bh * B, bw * B), bool); pad[:h, :w] = mask
    blk = pad.reshape(bh, B, bw, B).any(axis=(1, 3))
    lab = -np.ones(blk.shape, int); n = 0
    for y0, x0 in zip(*np.nonzero(blk)):
        if lab[y0, x0] >= 0: continue
        st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < bh and 0 <= xx < bw and blk[yy, xx] and lab[yy, xx] < 0:
                        lab[yy, xx] = n; st.append((yy, xx))
        n += 1
    full = np.repeat(np.repeat(lab, B, axis=0), B, axis=1)[:h, :w]
    return full, n


res = {'thr': thr, 'mazes': {}, 'places': []}
for m in MZ:
    A, L, M, J = img(tA, m), img(tL, m), img(tM, m), img(tJ, m)
    vA = open(tA.format(m=m) + '\\gf_b2view.txt').readline().strip()
    vL = open(tL.format(m=m) + '\\gf_b2view.txt').readline().strip()
    sL = json.load(open(tL.format(m=m) + '\\sites_gf.json'))
    sA = json.load(open(tA.format(m=m) + '\\sites_gf.json'))
    jun = [(s['site'], s['x'], s['y']) for s in sL['sites'] if s['kind'] == 'junction']
    cr = [(c['i'], c['dev'][0], c['dev'][1]) for c in json.load(open(tC.format(m=m)))['crossings']]
    dLA = dif(L, A) > thr; dJM = dif(J, M) > thr; dAM = dif(A, M) > thr
    ov = dJM & dAM
    P = np.where(dJM[..., None], J, A)
    dLP = (dif(L, P) > thr) & ~ov
    ovJ = ov & (dif(L, J) <= thr); ovA = ov & ~ovJ & (dif(L, A) <= thr); ovX = ov & ~ovJ & ~ovA
    jOK = dJM & ~dAM & ~dLP & dLA          # a junction-rule pixel, drawn as master draws it
    lp_chg = dLP & dLA                      # L differs from both A and the prediction
    lp_miss = dLP & ~dLA                    # L == A where master's junction rule changed the pixel (rule missing)
    rec = {'viewSame': vA == vL, 'hashA': sA['hash'], 'hashL': sL['hash'], 'lostL': sL.get('lost'),
           'LvsA': int(dLA.sum()), 'JvsM': int(dJM.sum()), 'AvsM': int(dAM.sum()), 'overlap': int(ov.sum()),
           'jOK': int(jOK.sum()), 'ovJ': int(ovJ.sum()), 'ovA': int(ovA.sum()), 'ovX': int(ovX.sum()),
           'devChg': int(lp_chg.sum()), 'devMiss': int(lp_miss.sum()),
           'JvsM_notInL': int((dJM & ~ov & dLP).sum())}
    allm = dLA | dLP | (ov & ~ovA & dLA)
    lab, n = clusters(dLA | dLP)
    rec['places'] = n
    res['mazes'][m] = rec
    dl = dif(L, A)
    for k in range(n):
        sel = lab == k
        ys, xs = np.nonzero(sel & (dLA | dLP))
        if not len(xs): continue
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        nj = min(jun, key=lambda s: (s[1] - cx) ** 2 + (s[2] - cy) ** 2) if jun else None
        nc = min(cr, key=lambda s: (s[1] - cx) ** 2 + (s[2] - cy) ** 2) if cr else None
        # nearest junction to ANY changed pixel of the place (a long place can sit beside one end)
        dj = min(float(np.min(np.hypot(xs - s[1], ys - s[2]))) for s in jun) if jun else 1e9
        dc = min(float(np.min(np.hypot(xs - s[1], ys - s[2]))) for s in cr) if cr else 1e9
        res['places'].append({'m': m, 'box': [x0, y0, x1, y1], 'px': int((sel & dLA).sum()),
                              'jOK': int((sel & jOK).sum()), 'ovJ': int((sel & ovJ).sum()), 'ovA': int((sel & ovA).sum()),
                              'ovX': int((sel & ovX).sum()), 'devChg': int((sel & lp_chg).sum()),
                              'devMiss': int((sel & lp_miss).sum()), 'maxLv': int(dl[sel].max()),
                              'jun': nj[0] if nj else None, 'dJun': round(dj, 1),
                              'x': nc[0] if nc else None, 'dX': round(dc, 1)})
json.dump(res, open(out, 'w'), indent=1)
T = {k: sum(r[k] for r in res['mazes'].values()) for k in ['LvsA', 'JvsM', 'AvsM', 'overlap', 'jOK', 'ovJ', 'ovA', 'ovX', 'devChg', 'devMiss', 'places']}
print('thr', thr, 'totals', T)
print('views same:', all(r['viewSame'] for r in res['mazes'].values()), ' hashes same:', all(r['hashA'] == r['hashL'] for r in res['mazes'].values()),
      ' lost:', sum(int(r['lostL'] or 0) for r in res['mazes'].values()))
print('%-4s %7s %7s %7s %6s %7s %5s %5s %5s %6s %6s %4s' % ('maze', 'L!=A', 'J!=M', 'A!=M', 'ovl', 'jOK', 'ovJ', 'ovA', 'ovX', 'devC', 'devM', 'pl'))
for m, r in res['mazes'].items():
    print('%-4s %7d %7d %7d %6d %7d %5d %5d %5d %6d %6d %4d' % (m, r['LvsA'], r['JvsM'], r['AvsM'], r['overlap'], r['jOK'], r['ovJ'], r['ovA'], r['ovX'], r['devChg'], r['devMiss'], r['places']))
