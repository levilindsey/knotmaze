# K1584 s12: screen.py's on-screen side verdicts (an12.ps1's out/an_<tag>/<maze>.json: m12 | tag) at chg12's changed
# places: per place, the sides whose margin-band point (`at`) lies within --r px of the place's changed pixels, with
# both captures' verdict and margin-band ink (gap < 0.25 <= part <= 0.75 < closed). Summary: verdict pairs, and the
# margin ink's spread at the changed places (how close mine sits to the 0.25 line).
#   python side12.py [--tag s12a] [--r 6]  -> out/side12_<tag>.txt
import sys, os, json
import numpy as np
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
TAG = opt('--tag', 's12a'); R = float(opt('--r', 6))
P = json.load(open(os.path.join(O, 'chg12_%s.json' % TAG)))['places']
S = {}
out = []; pairs = {}; inks = []; none = 0
for n, p in enumerate(P, 1):
    m = p['m']
    if m not in S: S[m] = json.load(open(os.path.join(O, 'an_' + TAG, m + '.json')))['sides']
    hit = []
    for s in S[m]:
        x, y = s['at']
        dx = max(p['x0'] - x, 0, x - p['x1']); dy = max(p['y0'] - y, 0, y - p['y1'])
        if dx * dx + dy * dy <= R * R: hit.append(s)
    if not hit: none += 1; out.append('%3d %s (%.0f,%.0f) x%s: no screen side within %g px' % (n, m, p['x'], p['y'], p['xi'], R)); continue
    for s in hit:
        a0, a1 = s['scr'][0], s['scr'][1]
        k = '%s -> %s' % (a0['v'], a1['v']); pairs[k] = pairs.get(k, 0) + 1
        if a1['gap'] is not None: inks.append((a1['gap'], a0['gap'] if a0['gap'] is not None else float('nan'), n, m, s['i']))
        out.append('%3d %s (%.0f,%.0f) x%s | side x%s d%+d l%+d: %s %s far %s | %s %s far %s' % (
            n, m, p['x'], p['y'], p['xi'], s['i'], s['dir'], s['lat'], a0['v'], a0['gap'], a0['far'], a1['v'], a1['gap'], a1['far']))
iv = np.array([v[0] for v in inks]); im = np.array([v[1] for v in inks])
summ = ['== %d changed places, %d with no screen side within %g px; side verdicts m12 -> %s: %s' % (len(P), none, R, TAG, dict(sorted(pairs.items()))),
        '   margin-band ink at those sides: m12 median %.3f max %.3f | %s median %.3f max %.3f; %s sides >= 0.20: %d, >= 0.25: %d' % (
            np.nanmedian(im), np.nanmax(im), TAG, np.median(iv), iv.max(), TAG, int((iv >= 0.2).sum()), int((iv >= 0.25).sum())),
        '   highest %s inks: %s' % (TAG, ', '.join('#%d %s x%s %.3f (m12 %.3f)' % (v[2], v[3], v[4], v[0], v[1]) for v in sorted(inks, reverse=True)[:8]))]
open(os.path.join(O, 'side12_%s.txt' % TAG), 'w').write('\n'.join(summ + [''] + out) + '\n')
print('\n'.join(summ))
