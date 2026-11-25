# K1584: does each crossing side show a gap ON SCREEN? Reads a capture (gf_b2.png) at the points gapcheck.ts
# recorded along each under border's centre line where it leaves the over thread (cnt json: x, y, e, model keep),
# and reports the capture's own border ink there. The model's keep is not used for the verdict.
#   python screen.py <cnt.json> <captureDir> [<captureDir2> ...] [--list id_id_...] [--json out.json]
# Verdict per side, from ink over 0.03 <= e <= 0.08 (inside the full-gap margin, clear of the over border's AA):
#   gap     mean ink < 0.25        closed  mean ink > 0.75        part  between
#   bare    the border is not drawn at 0.17 <= e <= 0.22 either (ink < 0.30): no border here to gap
import sys, json
import numpy as np
from PIL import Image

args = sys.argv[1:]
lst = None; outj = None
if '--list' in args:
    i = args.index('--list'); lst = set(int(v) for v in args[i + 1].split('_')); del args[i:i + 2]
if '--json' in args:
    i = args.index('--json'); outj = args[i + 1]; del args[i:i + 2]
cnt = json.load(open(args[0])); caps = args[1:]
INK = 20.0  # the border's luminance in a gf_b2 capture; fills and the background are 23 to 40


def load(d):
    return np.asarray(Image.open(d + r'\gf_b2.png').convert('L')).astype(np.float32)


def samp(a, x, y):
    x = np.clip(x - 0.5, 0, a.shape[1] - 1.001); y = np.clip(y - 0.5, 0, a.shape[0] - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    v = a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy
    return np.clip((INK + 3.5 - v) / 3.5, 0, 1)


sides = []
for c in cnt['crossings']:
    for b in c['borders']:
        p = np.array(b.get('pts') or [], np.float64).reshape(-1, 4)
        sides.append((c['i'], b['dir'], b['lat'], b['path'], b.get('keepM'), p, c['dev'], c.get('self', False)))

imgs = [load(d) for d in caps]
# calibrate the dev -> image offset on points the model keeps fully, far out along the walk
far = np.concatenate([s[5][(s[5][:, 2] >= 0.19) & (s[5][:, 3] >= 0.9)] for s in sides if len(s[5])])
best = (-1, 0, 0)
for dy in np.arange(-2, 2.5, 0.5):
    for dx in np.arange(-2, 2.5, 0.5):
        m = float(samp(imgs[0], far[:, 0] + dx, far[:, 1] + dy).mean())
        if m > best[0]: best = (m, dx, dy)
_, DX, DY = best
print(f'offset dx {DX} dy {DY}: far-point ink {best[0]:.3f} over {len(far)} points')


def verdict(a, p):
    if not len(p): return ('none', float('nan'), float('nan'))
    e = p[:, 2]; ink = samp(a, p[:, 0] + DX, p[:, 1] + DY)
    g = (e >= 0.03) & (e <= 0.08); f = (e >= 0.17) & (e <= 0.22)
    if not g.any(): return ('none', float('nan'), float('nan'))
    s = float(ink[g].mean()); fr = float(ink[f].mean()) if f.any() else float('nan')
    if s < 0.25: return ('bare' if (fr == fr and fr < 0.3) else 'gap', s, fr)
    return ('closed' if s > 0.75 else 'part', s, fr)


res = []
tot = [dict() for _ in caps]
for (i, d, l, path, km, p, dev, slf) in sides:
    vs = [verdict(a, p) for a in imgs]
    for k, v in enumerate(vs): tot[k][v[0]] = tot[k].get(v[0], 0) + 1
    gm = (p[:, 2] >= 0.03) & (p[:, 2] <= 0.08) if len(p) else np.zeros(0, bool)
    at = [float(p[gm, 0].mean()), float(p[gm, 1].mean())] if gm.any() else [dev[0], dev[1]]
    res.append(dict(i=i, dir=d, lat=l, model=path, keepM=km, dev=[dev[0] + DX, dev[1] + DY], at=at, self=slf,
                    scr=[dict(v=v[0], gap=None if v[1] != v[1] else round(v[1], 3), far=None if v[2] != v[2] else round(v[2], 3)) for v in vs]))
for k, d in enumerate(caps):
    print(d.split('\\')[-2] + '/' + d.split('\\')[-1], dict(sorted(tot[k].items())), 'of', len(sides))
if lst is not None or len(caps) > 1:
    for r in res:
        vv = [s['v'] for s in r['scr']]
        show = (lst is not None and r['i'] in lst) or (lst is None and (len(set(vv)) > 1))
        if lst is not None and r['i'] in lst or (lst is None and vv[-1] in ('closed', 'part')) or show:
            print(f"x{r['i']} d{r['dir']:+d} l{r['lat']:+d} model {r['model']} {r['keepM']}: " + ' | '.join(f"{s['v']} {s['gap']} far {s['far']}" for s in r['scr']))
if outj: json.dump(dict(dx=DX, dy=DY, caps=caps, sides=res), open(outj, 'w'))
