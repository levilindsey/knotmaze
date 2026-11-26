# K1584 s9: the tightness measure for every ball in a crossing's gap (stage 6's census, s6/balltable_s6a.txt), from the
# tight-turn tables (s6/tight/<m>.json: theta = the corner's opening angle between its two arms, r = fillet radius,
# W = border width). Sorted tightest first (smallest theta).
#   python measure.py <out.txt> [<out.json>]
import sys, json, os, re, math
here = os.path.dirname(os.path.abspath(__file__)); S6 = os.path.join(here, '..', 's6')
# the 8-ball wedge sheet (k1584-wedge wsheet.py BALLS, rows 1..8); Levi (2026-11-25): only the LAST row is tight enough
SEEN = [('A_3', 103), ('A_3', 157), ('A_3', 275), ('A_4', 343), ('A_a', 202), ('A_5', 2), ('A_6', 331), ('A_3', 63)]
balls = [l.split()[:2] for l in open(os.path.join(S6, 'balltable_s6a.txt')) if re.match(r'^[AD]_', l)]
rows = []
for m, k in balls:
    k = int(k[1:]); J = json.load(open(os.path.join(S6, 'tight', m + '.json')))
    t = [x for x in J['tight'] if x['k'] == k][0]; W = J['W']; s = abs(J['A'][0])
    th = t['theta']; r = t['r']
    seen = (SEEN.index((m, k)) + 1) if (m, k) in SEEN else 0
    rows.append(dict(m=m, k=k, theta=th, deg=math.degrees(th), r=r, rW=r / W, close=max(W - r, 0) / W / math.sin(th / 2),
                     px=(r + W) * s, dev=t['dev'], seen=seen))
rows.sort(key=lambda d: d['theta'])
with open(sys.argv[1], 'w') as f:
    f.write('rank maze k     theta(deg)  r/W   closed(W)  ball px  seen\n')
    for i, d in enumerate(rows):
        lab = ('wedge sheet row %d%s' % (d['seen'], ' (LEVI: tight)' if d['seen'] == 8 else ' (Levi: not tight)')) if d['seen'] else ''
        f.write('%4d %s k%-4d %6.1f      %.2f   %5.2f    %5.1f   %s\n' % (i + 1, d['m'], d['k'], d['deg'], d['rW'], d['close'], d['px'], lab))
if len(sys.argv) > 2: json.dump(rows, open(sys.argv[2], 'w'))
print(open(sys.argv[1]).read())
