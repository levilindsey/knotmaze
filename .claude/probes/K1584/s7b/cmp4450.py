# K1584 s7b: the diagnoses' places against stage 7's mirror. K1601's 44 rule-K crossings (rulek.py list, saved to
# out/k1601_44.txt) and K1595's 50 corner places (its out/scan/ruled_places.json) against s7's table diff (s7/out/tab)
# and pixel diff (s7/out/px via pxsum.py -o out/s7places.json).   python cmp4450.py [R=14]
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__)); S7 = os.path.join(H, '..', 's7')
R = float(sys.argv[1]) if len(sys.argv) > 1 else 14
K95 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1595-diag\.claude\probes\K1595\out\scan\ruled_places.json'
G = json.load(open(os.path.join(H, 'out', 's7places.json')))
TAB = {}
for f in os.listdir(os.path.join(S7, 'out', 'tab')):
    if f.endswith('.json'):
        J = json.load(open(os.path.join(S7, 'out', 'tab', f)))
        for p in J['places']:
            if p['x']: TAB.setdefault((f[:-5], p['rule']), set()).add(p['x']['i'])
print('== K1601 rule K: 44 crossings (s5d march census)')
nt = npx = 0; miss = []
for ln in open(os.path.join(H, 'out', 'k1601_44.txt')):
    m = re.match(r'(\S+) x(\d+) u c(\d+) o c(\d+) p \[([\d.]+), ([\d.]+)\]: (.*)', ln.strip())
    if not m: continue
    mz, x = m[1], int(m[2]); X, Y = float(m[5]), float(m[6])
    t = x in TAB.get((mz, 'K'), set())
    px = [g for g in G if g['m'] == mz and g['rule'] == 'K' and x in g['xs']]
    nt += t; npx += bool(px)
    if not px: miss.append(mz)
    print(f"  {mz} x{x:<4d} c{m[3]}<c{m[4]} at {X:.0f},{Y:.0f}  table {'K' if t else '-'}  px {sum(g['n'] for g in px) if px else 0:3d}  | {m[7]}")
print(f'  in s7 rule K table {nt} of 44, pixels change at {npx} of 44')
print('== K1595 corner rule: 50 places (s5 scan, rule b mirror, >= 5 px)')
nC = 0
for mz, k, n5, n4, X, Y, u, o in json.load(open(K95)):
    nb = [g for g in G if g['m'] == mz and g['rule'] == 'C' and g['bbox'][0] - R <= X <= g['bbox'][2] + R and g['bbox'][1] - R <= Y <= g['bbox'][3] + R]
    nC += bool(nb)
    print(f"  {mz} k{k:<4d} c{u}<c{o} at {X},{Y}  K1595 px {n5:3d}  s7 C px {sum(g['n'] for g in nb):3d} {[('x%s' % ','.join(map(str, g['xs'])), g['n']) for g in nb]}")
print(f'  pixels change near {nC} of 50 (R {R})')
