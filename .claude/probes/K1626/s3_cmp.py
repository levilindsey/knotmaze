# K1626 s3: first-pass joint eyes of one or more census JSONs (jeye.ts; several files merge) against stage 2's
# census: per build, n / under 1.5 / under 2, the three named eyes, and every eye that moved by more than 0.15 widths.
#   python s3_cmp.py <stage2.json> <name=a.json[+b.json...]> ...
import json, sys
base = json.load(open(sys.argv[1]))
NAMED = {'L': ['J138xX282', 'J64xX100', 'J13xX38']}
for arg in sys.argv[2:]:
    name, files = arg.split('=', 1)
    R = {}
    for f in files.split('+'):
        R.update(json.load(open(f)))
    n = u15 = u2 = 0; moved = []; mins = []
    for m in R:
        b = {e['eye']: e['open'] for e in base[m]['eyes'] if e['first']}
        for e in R[m]['eyes']:
            if not e['first']: continue
            n += 1; u15 += e['open'] < 1.5; u2 += e['open'] < 2
            if e['open'] < 1.5: mins.append(f"{m}:{e['eye']} {e['open']:.2f}")
            if e['eye'] in b and abs(e['open'] - b[e['eye']]) > 0.15:
                moved.append(f"{m}:{e['eye']} {b[e['eye']]:.2f}->{e['open']:.2f}")
    named = ''
    if 'L' in R:
        o = {e['eye']: e['open'] for e in R['L']['eyes']}
        named = ' '.join(f"{k} {o.get(k, float('nan')):.2f}" for k in NAMED['L'])
    print(f"{name}: mazes {len(R)} eyes {n} <1.5 {u15} <2 {u2} | {named}")
    print(f"   under 1.5: {', '.join(mins)}")
    print(f"   moved >0.15 ({len(moved)}): {', '.join(moved)}")
