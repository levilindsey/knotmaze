# K1626 s2: per maze and build, the first-pass joint eyes (jeye.ts JSONs): count, min, under 1.5, under 2 widths.
#   python eyetab.py <name=census.json> ...
import json, sys
R = {a.split('=')[0]: json.load(open(a.split('=', 1)[1])) for a in sys.argv[1:]}
first = next(iter(R.values()))
print('maze  ' + ' | '.join(f'{n:>19}' for n in R))
print('      ' + ' | '.join(f'{"n   min <1.5  <2":>19}' for n in R))
tot = {n: [0, 0, 0] for n in R}
for m in first:
    row = []
    for n in R:
        e = [x['open'] for x in R[n][m]['eyes'] if x['first']]
        a = sum(v < 1.5 for v in e); b = sum(v < 2 for v in e)
        tot[n][0] += len(e); tot[n][1] += a; tot[n][2] += b
        row.append(f'{len(e):3d} {min(e):5.2f} {a:4d} {b:3d}')
    print(f'{m:5s} ' + ' | '.join(f'{r:>19}' for r in row))
print('total ' + ' | '.join(f'{t[0]:3d}    {t[1]:4d} {t[2]:3d}'.rjust(19) for t in tot.values()))
# The sub-2 eyes of the last build: their arms' rest arc and the chord (widths), and the opening two straight-sided
# arms of that rest arc could make over that chord, (sqrt(rA^2 - c^2) + sqrt(rB^2 - c^2)) / 2: a lens of those
# arms at that joint-to-crossing distance cannot open wider without stretching them.
last = list(R)[-1]
print(f'\nsub-2 eyes of {last}: eye open | restA restB chord | straight-arm bound | arcA arcB (stretched arc)')
for m in first:
    for x in R[last][m]['eyes']:
        if not x['first'] or x['open'] >= 2: continue
        c = x['chord']; bd = (max(0, x['restA']**2 - c*c)**.5 + max(0, x['restB']**2 - c*c)**.5) / 2
        print(f"{m:5s} {x['eye']:11s} {x['open']:.2f} | {x['restA']:.2f} {x['restB']:.2f} {c:.2f} | {bd:.2f} ({x['open']/bd if bd else 0:.0%}) | {x['arcA']:.2f} {x['arcB']:.2f}")
